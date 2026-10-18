import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAdminBooks, updateBook, deleteBook, getPdfBlobUrl, saveBooksOrder } from '@/services/api';
import { Book, CATEGORIES, PRESET_EMOJIS } from '@/types/book';
import { formatBytes, generateCoverFromPdf } from '@/lib/pdfUtils';
import { UploadModal } from './UploadModal';
import { FlipBookViewer } from '@/components/viewer/FlipBookViewer';
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  FileText,
  Database,
  ExternalLink,
  Loader2,
  AlertTriangle,
  X,
  Layers,
  Palette,
  Save,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Smile,
  Upload,
  RefreshCw,
  Share2,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const queryClient = useQueryClient();

  // Modals & Viewer State
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [deletingBook, setDeletingBook] = useState<Book | null>(null);
  const [previewBook, setPreviewBook] = useState<Book | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');

  // Ordering & Saving State
  const [booksList, setBooksList] = useState<Book[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isSavingOrder, setIsSavingOrder] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Query admin books
  const { data, isLoading } = useQuery({
    queryKey: ['admin-books'],
    queryFn: fetchAdminBooks,
  });

  useEffect(() => {
    if (data?.books) {
      setBooksList((prev) => {
        // If user already reordered and count matches, retain order
        if (hasUnsavedChanges && prev.length === data.books.length) {
          return prev;
        }
        return [...data.books].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
      });
    }
  }, [data]);

  // Toggle Publish Mutation
  const togglePublishMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: boolean }) =>
      updateBook(id, { is_published: nextStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setDeletingBook(null);
    },
  });

  // Edit Mutation
  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateBook(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setEditingBook(null);
      setSaveToast('도서 정보가 성공적으로 수정되었습니다.');
      setTimeout(() => setSaveToast(null), 3000);
    },
  });

  // Reordering Logic (Move Up / Down)
  const handleMoveBook = (filteredIndex: number, direction: 'up' | 'down') => {
    const targetFilteredIndex = direction === 'up' ? filteredIndex - 1 : filteredIndex + 1;
    if (targetFilteredIndex < 0 || targetFilteredIndex >= filteredBooks.length) return;

    const currentBook = filteredBooks[filteredIndex];
    const targetBook = filteredBooks[targetFilteredIndex];

    setBooksList((prev) => {
      const list = [...prev];
      const fromIdx = list.findIndex((b) => b.id === currentBook.id);
      const toIdx = list.findIndex((b) => b.id === targetBook.id);
      if (fromIdx === -1 || toIdx === -1) return prev;

      const temp = list[fromIdx];
      list[fromIdx] = list[toIdx];
      list[toIdx] = temp;

      return list.map((b, i) => ({ ...b, sort_order: i + 1 }));
    });

    setHasUnsavedChanges(true);
  };

  // Save All Changes (Explicit Save Button)
  const handleSaveAllChanges = async () => {
    setIsSavingOrder(true);
    try {
      await saveBooksOrder(booksList);
      await queryClient.invalidateQueries({ queryKey: ['admin-books'] });
      await queryClient.invalidateQueries({ queryKey: ['books'] });
      setHasUnsavedChanges(false);
      setSaveToast('도서 순서 및 변경사항이 성공적으로 저장되었습니다.');
      setTimeout(() => setSaveToast(null), 3000);
    } catch (err: any) {
      alert('저장 중 오류가 발생했습니다: ' + (err.message || 'Error'));
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Copy Direct Viewer Link (Works even when unlisted/hidden)
  const handleCopyDirectLink = (book: Book) => {
    const directUrl = `https://create.allforedu.kr/curriculum/#/read/${book.id}`;
    navigator.clipboard.writeText(directUrl);
    setSaveToast(`'${book.title}' 열람 링크가 복사되었습니다! (서재에서 숨겨져 있어도 이 링크로 누구나 바로 열람 가능)`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Navigate to Library with auto-save
  const handleHomeClick = async (e: React.MouseEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      await handleSaveAllChanges();
      window.location.hash = '#/';
    }
  };

  // Open Preview in 3D Viewer
  const handleOpenPreview = async (book: Book) => {
    try {
      const url = await getPdfBlobUrl(book.id);
      setPreviewPdfUrl(url);
      setPreviewBook(book);
    } catch {
      alert('PDF 미리보기를 열 수 없습니다.');
    }
  };

  // Filtered books
  const filteredBooks = booksList.filter((book) => {
    const matchCat = selectedCategory === '전체' || book.category === selectedCategory;
    const matchQuery =
      !searchQuery ||
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (book.description && book.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchQuery;
  });

  // Stats calculation
  const totalBooksCount = booksList.length;
  const publishedCount = booksList.filter((b) => b.is_published === 1).length;
  const unpublishedCount = totalBooksCount - publishedCount;
  const totalSizeBytes = booksList.reduce((sum, b) => sum + (b.file_size || 0), 0);

  return (
    <div className="space-y-8 relative">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2d3a54] text-white px-5 py-3 rounded-[16px] shadow-2xl border border-[#45577d] flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#4aab82]" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* 1. Header & Quick Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#e8edf6]">
        <div>
          <div className="inline-block text-[11px] font-black text-[#586fca] bg-[#eef3ff] border border-[#dce5fb] px-2.5 py-0.5 rounded-full mb-1.5">
            📖 2번 서재 관리 모드
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#34476a] tracking-tight">
            CREATE 교과전담 수업지도안 관리 센터
          </h1>
          <p className="text-xs sm:text-sm text-[#8a96aa] mt-1">
            2번 서재에 게시된 교과전담(영어, 체육, 과학, 보건, 통합) 수업지도안 및 길잡이 전자책을 관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Explicit Save Button */}
          <button
            onClick={handleSaveAllChanges}
            disabled={isSavingOrder}
            className={`px-4 py-2.5 rounded-[13px] text-xs font-black flex items-center gap-1.5 transition-all shadow-sm ${
              hasUnsavedChanges
                ? 'bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white shadow-emerald-500/25 ring-2 ring-emerald-400 scale-[1.02]'
                : 'bg-white border border-[#dce5fb] text-[#586fca] hover:bg-[#f4f7fe]'
            }`}
            title="현재 순서 및 변경사항을 저장합니다"
          >
            {isSavingOrder ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{hasUnsavedChanges ? '순서 저장하기 (변경됨)' : '저장하기'}</span>
          </button>

          {/* Go to Library Home */}
          <a
            href="#/"
            onClick={handleHomeClick}
            className="px-4 py-2.5 rounded-[13px] bg-white border border-[#dce5fb] text-[#586fca] hover:bg-[#f4f7fe] text-xs font-extrabold flex items-center gap-1.5 transition shadow-sm"
          >
            <BookOpen className="w-4 h-4" /> 서재 홈 바로가기
          </a>

          {/* New Book Upload */}
          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-5 py-2.5 rounded-[13px] bg-[#687fe0] hover:bg-[#566ecf] text-white text-xs font-extrabold shadow-edu-btn flex items-center gap-2 transition hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" /> 신규 PDF 등록
          </button>
        </div>
      </div>

      {/* 2. Statistical Metric Cards with create.allforedu.kr Colors */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total: Blue */}
        <div className="p-5 bg-white rounded-[20px] border border-[#e8edf6] shadow-edu-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-[14px] bg-[#eaf2ff] text-[#687fe0] flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-[#8a96aa] font-bold">전체 등록 자료</div>
            <div className="text-2xl font-black text-[#34415c]">{totalBooksCount}권</div>
          </div>
        </div>

        {/* Published: Mint */}
        <div className="p-5 bg-white rounded-[20px] border border-[#e8edf6] shadow-edu-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-[14px] bg-[#eaf9f2] text-[#4aab82] flex items-center justify-center shrink-0">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-[#8a96aa] font-bold">열람 가능 (공개)</div>
            <div className="text-2xl font-black text-[#4aab82]">{publishedCount}권</div>
          </div>
        </div>

        {/* Unpublished: Peach */}
        <div className="p-5 bg-white rounded-[20px] border border-[#e8edf6] shadow-edu-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-[14px] bg-[#fff0e3] text-[#f5a623] flex items-center justify-center shrink-0">
            <EyeOff className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-[#8a96aa] font-bold">비공개 자료</div>
            <div className="text-2xl font-black text-[#f5a623]">{unpublishedCount}권</div>
          </div>
        </div>

        {/* Storage: Lavender */}
        <div className="p-5 bg-white rounded-[20px] border border-[#e8edf6] shadow-edu-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-[14px] bg-[#f1ecff] text-[#7c63d8] flex items-center justify-center shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-[#8a96aa] font-bold">스토리지 용량</div>
            <div className="text-2xl font-black text-[#7c63d8]">{formatBytes(totalSizeBytes)}</div>
          </div>
        </div>
      </div>

      {/* 3. Search and Category Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-[20px] border border-[#e8edf6] shadow-edu-card">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-[#9aa7bd] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="자료명 검색..."
            className="w-full pl-9 pr-4 py-2 bg-[#f8faff] border border-[#e2e8f4] rounded-[13px] text-xs font-bold text-[#34415c] focus:outline-none focus:border-[#687fe0] transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {hasUnsavedChanges && (
            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 animate-pulse">
              ● 순서 변경됨 (상단 [순서 저장하기] 클릭 필요)
            </span>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8a96aa] font-bold whitespace-nowrap">분류:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-[#f8faff] border border-[#e2e8f4] rounded-[13px] text-xs font-bold text-[#34415c] focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4. Books Table */}
      <div className="bg-white rounded-[23px] border border-[#e8edf6] shadow-edu-card overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#687fe0] animate-spin mb-2" />
            <span className="text-xs text-[#8a96aa] font-bold">자료 목록을 조회하고 있습니다...</span>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="py-16 text-center">
            <Layers className="w-10 h-10 text-[#cdd7eb] mx-auto mb-2" />
            <p className="text-sm font-bold text-[#34415c]">해당 조건의 교과전담 자료가 없습니다.</p>
            <p className="text-xs text-[#8a96aa] mt-1">상단의 [신규 PDF 등록] 버튼을 눌러 새 전자책을 추가해보세요.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f8faff] border-b border-[#e8edf6] text-[#8a96aa] uppercase tracking-wider font-extrabold">
                  <th className="py-3.5 px-4 text-center w-20">순서</th>
                  <th className="py-3.5 px-4">자료 정보</th>
                  <th className="py-3.5 px-4">카테고리</th>
                  <th className="py-3.5 px-4">페이지 / 크기</th>
                  <th className="py-3.5 px-4">열람 상태</th>
                  <th className="py-3.5 px-4">등록일자</th>
                  <th className="py-3.5 px-4 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0f6] font-normal text-[#34415c]">
                {filteredBooks.map((book, index) => {
                  const isPub = book.is_published === 1;
                  return (
                    <tr key={book.id} className="hover:bg-[#f8faff] transition-colors">
                      {/* Reorder Buttons & Index */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1 bg-[#f4f7fe] px-2 py-1 rounded-[10px] border border-[#dce5fb]">
                          <span className="font-mono font-black text-[#586fca] text-xs">
                            #{index + 1}
                          </span>
                          <div className="flex flex-col ml-1">
                            <button
                              type="button"
                              onClick={() => handleMoveBook(index, 'up')}
                              disabled={index === 0}
                              className={`p-0.5 rounded transition ${
                                index === 0
                                  ? 'text-[#ccd5e6] cursor-not-allowed'
                                  : 'text-[#687fe0] hover:bg-[#e4ecfb] cursor-pointer'
                              }`}
                              title="위로 이동"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveBook(index, 'down')}
                              disabled={index === filteredBooks.length - 1}
                              className={`p-0.5 rounded transition ${
                                index === filteredBooks.length - 1
                                  ? 'text-[#ccd5e6] cursor-not-allowed'
                                  : 'text-[#687fe0] hover:bg-[#e4ecfb] cursor-pointer'
                              }`}
                              title="아래로 이동"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Title & Emoji & Preview */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-14 bg-[#eaf2ff] rounded-[10px] shadow-sm overflow-hidden shrink-0 flex items-center justify-center text-2xl border border-[#dce5fb]">
                            <span>{book.emoji || '📖'}</span>
                          </div>
                          <div className="max-w-xs sm:max-w-md">
                            <div className="font-extrabold text-[#34415c] line-clamp-1">{book.title}</div>
                            <div className="text-[11px] text-[#8a96aa] line-clamp-1 mt-0.5">
                              {book.description || '설명 없음'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 bg-[#f4f6fb] text-[#8490a8] rounded-full font-extrabold">
                          {book.category}
                        </span>
                      </td>

                      {/* Specs */}
                      <td className="py-3 px-4 font-bold text-[#8a96aa]">
                        {book.page_count}P / {formatBytes(book.file_size)}
                      </td>

                      {/* Publish Switch */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col items-start gap-1">
                          <button
                            onClick={() =>
                              togglePublishMutation.mutate({
                                id: book.id,
                                nextStatus: !isPub,
                              })
                            }
                            disabled={togglePublishMutation.isPending}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold transition ${
                            isPub
                                ? 'bg-[#eaf9f2] text-[#4aab82] hover:bg-[#d8f5e7]'
                                : 'bg-[#fff0e3] text-[#f5a623] hover:bg-[#ffe6d1]'
                            }`}
                          >
                            {isPub ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {isPub ? '열람 가능' : '숨김(비공개)'}
                          </button>
                          {!isPub && (
                            <span className="text-[10px] text-[#f5a623] font-bold">
                              ※ 링크로 열람 가능
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-[#8a96aa] text-[11px] font-medium">
                        {new Date(book.created_at).toLocaleDateString('ko-KR')}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleCopyDirectLink(book)}
                            className="p-1.5 text-[#4aab82] hover:bg-[#eaf9f2] rounded-[9px] transition"
                            title="직접 열람 링크 복사 (서재에서 숨겨져 있어도 이 링크로 누구나 바로 열람 가능)"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenPreview(book)}
                            className="p-1.5 text-[#687fe0] hover:bg-[#eaf2ff] rounded-[9px] transition"
                            title="3D 뷰어 열기"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingBook(book)}
                            className="p-1.5 text-[#8a96aa] hover:text-[#34415c] hover:bg-[#f4f6fb] rounded-[9px] transition"
                            title="자료 정보 수정 및 파일 교체"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingBook(book)}
                            className="p-1.5 text-[#e06b98] hover:bg-[#ffedf3] rounded-[9px] transition"
                            title="자료 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-books'] });
          queryClient.invalidateQueries({ queryKey: ['books'] });
          setSaveToast('새 전자책이 성공적으로 등록되었습니다.');
          setTimeout(() => setSaveToast(null), 3000);
        }}
      />

      {/* 6. Edit Modal */}
      {editingBook && (
        <EditBookModal
          book={editingBook}
          isOpen={true}
          onClose={() => setEditingBook(null)}
          onSave={(payload) => editMutation.mutate({ id: editingBook.id, payload })}
          isSaving={editMutation.isPending}
        />
      )}

      {/* 7. Delete Confirmation Dialog */}
      {deletingBook && (
        <div className="fixed inset-0 z-50 bg-[#26314e]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl border border-[#e8edf6]">
            <div className="w-10 h-10 rounded-[14px] bg-[#ffedf3] text-[#e06b98] flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-[#34415c] mb-1">전자책 삭제 확인</h3>
            <p className="text-xs text-[#8a96aa] mb-4 leading-relaxed">
              정말로 <strong className="text-[#34415c]">'{deletingBook.title}'</strong> 자료를 삭제하시겠습니까?
              D1 메타데이터와 Cloudflare R2 원본 파일이 영구 삭제됩니다.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeletingBook(null)}
                className="px-3.5 py-2 rounded-[12px] border border-[#e8edf6] text-xs font-bold text-[#8a96aa] hover:bg-[#f8faff]"
              >
                취소
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingBook.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-[12px] bg-[#e06b98] hover:bg-[#c85580] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                삭제 확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Fullscreen Preview 3D FlipBook Viewer */}
      {previewBook && previewPdfUrl && (
        <FlipBookViewer
          pdfUrl={previewPdfUrl}
          title={previewBook.title}
          onClose={() => {
            setPreviewBook(null);
            setPreviewPdfUrl(null);
          }}
        />
      )}
    </div>
  );
};

// Edit Modal Sub-component
interface EditBookModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: any) => void;
  isSaving: boolean;
}

const EditBookModal: React.FC<EditBookModalProps> = ({ book, onClose, onSave, isSaving }) => {
  const [title, setTitle] = useState(book.title);
  const [category, setCategory] = useState(book.category);
  const [description, setDescription] = useState(book.description || '');
  const [emoji, setEmoji] = useState(book.emoji || '📖');
  const [isPublished, setIsPublished] = useState(book.is_published === 1);

  // PDF replacement state
  const [newPdfFile, setNewPdfFile] = useState<File | null>(null);
  const [newPageCount, setNewPageCount] = useState<number | null>(null);
  const [autoUpdateCover, setAutoUpdateCover] = useState<boolean>(true);
  const [isExtractingCover, setIsExtractingCover] = useState<boolean>(false);
  const [newCoverBlob, setNewCoverBlob] = useState<Blob | null>(null);
  const [newCoverPreview, setNewCoverPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePdfChange = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setFileError('PDF 파일(.pdf)만 선택 가능합니다.');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setFileError('파일 크기는 최대 100MB를 초과할 수 없습니다.');
      return;
    }
    setFileError(null);
    setNewPdfFile(file);

    if (autoUpdateCover) {
      setIsExtractingCover(true);
      try {
        const extracted = await generateCoverFromPdf(file);
      setNewPageCount(extracted.pageCount);
        setNewCoverBlob(extracted.coverBlob);
        setNewCoverPreview(extracted.coverDataUrl);
      } catch (err) {
        console.warn('새 PDF 표지 추출 실패:', err);
      } finally {
        setIsExtractingCover(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: title.trim(),
      category,
      description: description.trim(),
      emoji: emoji || '📖',
      is_published: isPublished,
      pdf_file: newPdfFile || undefined,
      cover_file: (autoUpdateCover && newCoverBlob) ? newCoverBlob : undefined,
      page_count: newPageCount ?? undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#26314e]/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[24px] max-w-lg w-full p-6 shadow-2xl relative border border-[#e8edf6] max-h-[92vh] overflow-y-auto my-auto">
        <button onClick={onClose} className="absolute right-5 top-5 text-[#8a96aa] hover:text-[#34415c]">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-[14px] bg-[#eef3ff] border border-[#dce5fb] flex items-center justify-center text-2xl shrink-0">
            {emoji || '📖'}
          </div>
          <div>
            <h3 className="text-lg font-black text-[#34415c]">도서 정보 수정 및 파일 관리</h3>
            <p className="text-xs text-[#8a96aa]">자료 메타데이터 및 PDF 원본 파일을 변경할 수 있습니다.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-[#34415c] mb-1">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-[#f8faff] border border-[#e2e8f4] rounded-[13px] text-xs font-bold text-[#34415c] focus:bg-white focus:outline-none focus:border-[#687fe0]"
            />
          </div>

          {/* Emoji Selection */}
          <div>
            <label className="flex items-center justify-between text-xs font-bold text-[#34415c] mb-1">
              <span className="flex items-center gap-1.5">
                <Smile className="w-4 h-4 text-[#687fe0]" />
                <span>대표 이모지 변경</span>
              </span>
              <span className="text-[11px] text-[#8a96aa]">목록과 카드에 반영</span>
            </label>
            <div className="p-3 bg-[#f8faff] border border-[#e2e8f4] rounded-[14px] space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-[11px] bg-white border border-[#dce5fb] flex items-center justify-center text-xl shrink-0 shadow-xs">
                  {emoji || '📖'}
                </div>
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  placeholder="이모지 직접 입력 또는 아래 클릭"
                  maxLength={4}
                  className="w-full px-3 py-1.5 bg-white border border-[#e2e8f4] rounded-[10px] text-xs font-bold text-[#34415c] focus:outline-none focus:border-[#687fe0]"
                />
              </div>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pt-1">
                {PRESET_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEmoji(em)}
                    className={`w-7 h-7 rounded-[8px] text-sm flex items-center justify-center transition-all ${
                      emoji === em
                        ? 'bg-[#687fe0] text-white ring-2 ring-[#687fe0]/30 shadow-xs scale-105'
                        : 'bg-white hover:bg-[#eef3ff] border border-[#e2e8f4] text-[#34415c]'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* PDF Replacement Section */}
          <div>
            <label className="flex items-center justify-between text-xs font-bold text-[#34415c] mb-1">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#687fe0]" />
                <span>PDF 파일 관리 (파일 교체)</span>
              </span>
              <span className="text-[11px] text-[#8a96aa]">
                현재: {formatBytes(book.file_size)} / {book.page_count}P
              </span>
            </label>

            <div className="p-3.5 bg-[#f8faff] border border-[#e2e8f4] rounded-[15px] space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handlePdfChange(e.target.files[0]);
                  }
                }}
              />

              {!newPdfFile ? (
                <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-[12px] border border-[#e8edf6]">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#8a96aa]" />
                    <span className="text-xs text-[#62708b] font-medium">기존 PDF 파일 유지 중</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-[#eef3ff] hover:bg-[#e2eaff] text-[#586fca] rounded-[10px] text-xs font-black transition flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" /> 새 PDF로 교체
                  </button>
                </div>
              ) : (
                <div className="bg-[#eef9f2] p-3 rounded-[12px] border border-[#bcecd4] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-[#4aab82] shrink-0" />
                      <span className="text-xs font-black text-[#2e7d5b] truncate">
                        {newPdfFile.name}
                      </span>
                      <span className="text-[11px] text-[#4aab82] font-mono shrink-0">
                        ({formatBytes(newPdfFile.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNewPdfFile(null);
                        setNewCoverBlob(null);
                        setNewCoverPreview(null);
                      }}
                      className="text-xs text-[#e06b98] hover:underline font-bold shrink-0 flex items-center gap-0.5"
                    >
                      <RefreshCw className="w-3 h-3" /> 취소
                    </button>
                  </div>

                  <label className="flex items-center gap-2 text-[11px] font-bold text-[#34415c] cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={autoUpdateCover}
                      onChange={(e) => setAutoUpdateCover(e.target.checked)}
                      className="rounded text-[#4aab82] focus:ring-[#4aab82]"
                    />
                    새 PDF 1페이지로 표지 썸네일도 자동 갱신
                  </label>

                  {newCoverPreview && autoUpdateCover && (
                    <div className="flex items-center gap-3 bg-white p-2.5 rounded-[11px] border border-[#d5edd9] mt-2">
                      <img
                        src={newCoverPreview}
                        alt="새 표지 미리보기"
                        className="w-10 h-14 object-cover rounded-[6px] shadow-xs border border-[#e2e8f4]"
                      />
                      <div className="text-[11px] text-[#2e7d5b] font-bold">
                        <div>✓ 새 PDF 1페이지 표지 자동 추출 완료</div>
                        <div className="text-[10px] text-[#8a96aa] font-medium mt-0.5">
                          {newPageCount ? `총 ${newPageCount}페이지 확인됨` : '표지 갱신 준비 완료'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {fileError && <p className="text-xs text-[#e06b98] font-bold">{fileError}</p>}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-[#34415c] mb-1">카테고리</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#f8faff] border border-[#e2e8f4] rounded-[13px] text-xs font-bold text-[#34415c] focus:bg-white focus:outline-none focus:border-[#687fe0]"
            >
              {CATEGORIES.filter((c) => c !== '전체').map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Published */}
          <div>
            <label className="block text-xs font-bold text-[#34415c] mb-1">열람 상태</label>
            <label className="flex items-center gap-2 text-xs font-bold text-[#34415c] cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="rounded text-[#687fe0] focus:ring-[#687fe0]"
              />
              연구학교 성과공유 서재에 노출 (열람 가능)
            </label>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-[#34415c] mb-1">상세 설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3.5 py-2.5 bg-[#f8faff] border border-[#e2e8f4] rounded-[13px] text-xs text-[#34415c] focus:bg-white focus:outline-none focus:border-[#687fe0] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-[#e8edf6]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-[12px] border border-[#e8edf6] text-xs font-bold text-[#8a96aa] hover:bg-[#f8faff]"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving || isExtractingCover}
              className="px-4 py-2 rounded-[12px] bg-[#687fe0] hover:bg-[#566ecf] text-white text-xs font-bold flex items-center gap-1.5 shadow-edu-btn"
            >
              {(isSaving || isExtractingCover) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {newPdfFile ? '파일 교체 및 변경사항 저장' : '변경사항 저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
