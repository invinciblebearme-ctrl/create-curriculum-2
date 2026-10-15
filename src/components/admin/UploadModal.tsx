import React, { useState, useRef } from 'react';
import { CATEGORIES, CategoryOption } from '@/types/book';
import { generateCoverFromPdf, formatBytes } from '@/lib/pdfUtils';
import { uploadBook } from '@/services/api';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<CategoryOption>('영어');
  const [isPublished, setIsPublished] = useState<boolean>(true);

  // Cover extraction
  const [extractedCoverBlob, setExtractedCoverBlob] = useState<Blob | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [customCoverFile, setCustomCoverFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);

  // Status & Progress
  const [isExtractingCover, setIsExtractingCover] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Process selected PDF
  const handlePdfSelected = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('PDF 파일(.pdf)만 업로드할 수 있습니다.');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setErrorMessage('파일 크기는 최대 100MB를 초과할 수 없습니다.');
      return;
    }

    setErrorMessage(null);
    setPdfFile(file);

    // Auto title
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    setTitle(cleanTitle);

    // Auto-generate cover
    setIsExtractingCover(true);
    try {
      const extracted = await generateCoverFromPdf(file);
      setExtractedCoverBlob(extracted.coverBlob);
      setCoverPreviewUrl(extracted.coverDataUrl);
      setPageCount(extracted.pageCount);
      setCustomCoverFile(null);
    } catch (err: any) {
      console.warn('표지 자동 추출 실패:', err);
    } finally {
      setIsExtractingCover(false);
    }
  };

  const handleCustomCoverSelected = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일(JPG, PNG, WebP)만 선택 가능합니다.');
      return;
    }
    setCustomCoverFile(file);
    setCoverPreviewUrl(URL.createObjectURL(file));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePdfSelected(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile || !title.trim()) {
      setErrorMessage('PDF 파일과 자료 제목을 모두 입력해 주세요.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(25);
    setErrorMessage(null);

    try {
      const coverToSend = customCoverFile || extractedCoverBlob || undefined;

      setUploadProgress(60);
      await uploadBook({
        title: title.trim(),
        description: description.trim(),
        category,
        is_published: isPublished,
        pdf_file: pdfFile,
        cover_file: coverToSend,
      });

      setUploadProgress(100);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 400);
    } catch (err: any) {
      setErrorMessage('업로드 실패: ' + (err.message || '오류가 발생했습니다.'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#26314e]/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[24px] max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative border border-[#e8edf6] my-8">
        <button
          onClick={onClose}
          disabled={isUploading}
          className="absolute right-5 top-5 text-[#8a96aa] hover:text-[#34415c] p-1.5 rounded-full hover:bg-[#f4f6fb] transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-10 h-10 rounded-[14px] bg-[#e2eaff] text-[#687fe0] flex items-center justify-center">
            <UploadCloud className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-black text-[#34415c]">신규 단원설계안 PDF 등록</h2>
        </div>
        <p className="text-xs text-[#8a96aa] mb-6">
          PDF 문서를 선택하면 1페이지를 분석하여 고화질 표지를 자동으로 추출·생성합니다.
        </p>

        {errorMessage && (
          <div className="mb-4 p-3.5 bg-[#ffedf3] border border-[#ff6b9d]/30 rounded-[13px] flex items-center gap-2 text-xs text-[#e06b98] font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. PDF Drag & Drop Area */}
          {!pdfFile ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-[20px] p-8 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-[#687fe0] bg-[#eaf2ff]/50 scale-[1.01]'
                  : 'border-[#e0e8fa] hover:border-[#687fe0] hover:bg-[#f8faff]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePdfSelected(e.target.files[0])}
              />
              <UploadCloud className="w-10 h-10 text-[#687fe0] mx-auto mb-3" />
              <p className="text-sm font-extrabold text-[#34415c]">
                여기로 PDF 파일을 드래그하거나 <span className="text-[#687fe0] underline">클릭하여 선택</span>
              </p>
              <p className="text-xs text-[#8a96aa] mt-1">최대 100MB 크기의 표준 PDF 문서</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-5 p-4 rounded-[18px] bg-[#f8faff] border border-[#e8edf6]">
              {/* Cover Preview & Switch */}
              <div className="w-28 sm:w-32 aspect-[1/1.42] bg-[#e2eaff] rounded-[14px] overflow-hidden shadow-book relative shrink-0 flex items-center justify-center">
                {isExtractingCover ? (
                  <div className="flex flex-col items-center justify-center p-2 text-center">
                    <Loader2 className="w-5 h-5 text-[#687fe0] animate-spin mb-1" />
                    <span className="text-[10px] text-[#8a96aa] font-bold">표지 추출 중</span>
                  </div>
                ) : coverPreviewUrl ? (
                  <img src={coverPreviewUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                ) : (
                  <FileText className="w-8 h-8 text-[#687fe0]/50" />
                )}

                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="absolute bottom-1.5 right-1.5 px-2 py-1 bg-[#34476a]/80 hover:bg-[#34476a] text-white text-[10px] font-bold rounded-[8px] backdrop-blur shadow flex items-center gap-1"
                  title="다른 이미지로 표지 교체"
                >
                  <ImageIcon className="w-3 h-3" /> 변경
                </button>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleCustomCoverSelected(e.target.files[0])}
                />
              </div>

              {/* PDF Info & Reset */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-[#4aab82] font-black mb-1">
                    <CheckCircle2 className="w-4 h-4 text-[#4aab82]" />
                    <span>PDF 분석 완료</span>
                  </div>
                  <p className="text-sm font-extrabold text-[#34415c] line-clamp-1">{pdfFile.name}</p>
                  <div className="flex items-center gap-3 text-xs text-[#8a96aa] font-bold mt-1.5">
                    <span>{formatBytes(pdfFile.size)}</span>
                    {pageCount > 0 && <span>총 {pageCount} 페이지</span>}
                    {customCoverFile ? (
                      <span className="text-[#687fe0] font-black">사용자 지정 표지</span>
                    ) : (
                      <span className="text-[#687fe0] font-black">1페이지 자동 표지</span>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#e8edf6] flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPdfFile(null);
                      setCoverPreviewUrl(null);
                      setExtractedCoverBlob(null);
                      setCustomCoverFile(null);
                    }}
                    className="text-xs text-[#e06b98] hover:underline font-bold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> 다른 PDF 선택
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. Metadata Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#34415c] mb-1.5">
                자료 제목 <span className="text-[#e06b98]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="도서 제목을 입력하세요"
                required
                className="w-full px-3.5 py-2.5 bg-[#f8faff] border border-[#e2e8f4] rounded-[13px] text-sm font-bold text-[#34415c] focus:bg-white focus:outline-none focus:border-[#687fe0] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#34415c] mb-1.5">카테고리</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryOption)}
                className="w-full px-3.5 py-2.5 bg-[#f8faff] border border-[#e2e8f4] rounded-[13px] text-sm font-bold text-[#34415c] focus:bg-white focus:outline-none focus:border-[#687fe0] transition"
              >
                {CATEGORIES.filter((c) => c !== '전체').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#34415c] mb-1.5">열람 상태</label>
              <div className="flex items-center gap-4 h-[42px]">
                <label className="flex items-center gap-2 text-xs font-bold text-[#34415c] cursor-pointer">
                  <input
                    type="radio"
                    name="publish_status"
                    checked={isPublished}
                    onChange={() => setIsPublished(true)}
                    className="text-[#687fe0] focus:ring-[#687fe0]"
                  />
                  공개 (서재 노출)
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-[#34415c] cursor-pointer">
                  <input
                    type="radio"
                    name="publish_status"
                    checked={!isPublished}
                    onChange={() => setIsPublished(false)}
                    className="text-[#687fe0] focus:ring-[#687fe0]"
                  />
                  비공개 (관리자 전용)
                </label>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#34415c] mb-1.5">상세 설명</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="단원 설계안의 수업 개요, 특징 등을 입력하세요"
                rows={3}
                className="w-full px-3.5 py-2.5 bg-[#f8faff] border border-[#e2e8f4] rounded-[13px] text-sm font-medium text-[#34415c] focus:bg-white focus:outline-none focus:border-[#687fe0] transition resize-none"
              />
            </div>
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="pt-2">
              <div className="flex justify-between text-xs text-[#8a96aa] font-bold mb-1">
                <span>R2 스토리지 저장 및 D1 메타데이터 기록 중...</span>
                <span className="font-mono text-[#687fe0]">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-[#e2eaff] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#687fe0] transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Form Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-[#e8edf6]">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2.5 rounded-[13px] border border-[#e8edf6] text-xs font-bold text-[#8a96aa] hover:bg-[#f8faff] transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isUploading || !pdfFile || !title.trim()}
              className="px-6 py-2.5 rounded-[13px] bg-[#687fe0] hover:bg-[#566ecf] disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold shadow-edu-btn flex items-center gap-2 transition"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> 업로드 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> 단원설계안 등록 완료
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
