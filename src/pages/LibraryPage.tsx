import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBooks, getPdfBlobUrl } from '@/services/api';
import { Book } from '@/types/book';
import { Header } from '@/components/common/Header';
import { BookCard } from '@/components/library/BookCard';
import { CategoryBar } from '@/components/library/CategoryBar';
import { FlipBookViewer } from '@/components/viewer/FlipBookViewer';
import { BookOpen, Sparkles, AlertCircle, Loader2, BookCheck, Lightbulb, Compass, ExternalLink } from 'lucide-react';

export const LibraryPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<'order' | 'latest' | 'title'>('order');

  // Active book states for viewer
  const [activeReadingBook, setActiveReadingBook] = useState<Book | null>(null);
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);
  const [isPreparingViewer, setIsPreparingViewer] = useState<boolean>(false);

  // TanStack Query for books
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['books', selectedCategory, searchQuery, sortOption],
    queryFn: () =>
      fetchBooks({
        category: selectedCategory,
        q: searchQuery,
        sort: sortOption,
      }),
  });

  const books = data?.books || [];

  // Open 3D viewer
  const handleOpenBook = async (book: Book) => {
    try {
      setIsPreparingViewer(true);
      const url = await getPdfBlobUrl(book.id);
      setActivePdfUrl(url);
      setActiveReadingBook(book);
    } catch {
      alert('PDF 파일을 열 수 없습니다.');
    } finally {
      setIsPreparingViewer(false);
    }
  };

  const handleCloseViewer = () => {
    setActiveReadingBook(null);
    setActivePdfUrl(null);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-[#e2eaff] selection:text-[#586fca]">
      <Header />

      <div className="max-w-[1160px] w-full mx-auto px-4 sm:px-6 pt-5 pb-16">
        {/* 1. Hero Section (Exact create.allforedu.kr Match) */}
        <section className="relative overflow-hidden rounded-[31px] bg-gradient-to-r from-[#dcecff] via-[#e9eaff] to-[#ffeef4] border border-[#e0e8fa] shadow-edu-hero text-center py-16 px-6 sm:px-12 my-3">
          {/* Decorative Floating Emblems */}
          <div className="absolute left-[7%] top-[22%] text-4xl sm:text-5xl opacity-80 -rotate-12 pointer-events-none select-none">
            🎨
          </div>
          <div className="absolute right-[8%] top-[18%] text-4xl sm:text-5xl opacity-80 rotate-12 pointer-events-none select-none">
            💡
          </div>
          <div className="absolute right-[17%] bottom-[20%] text-2xl sm:text-3xl opacity-80 pointer-events-none select-none">
            📚
          </div>

          <div className="relative z-10 max-w-2xl mx-auto">
            {/* Eyebrow Badge */}
            <span className="inline-block text-[11px] font-black tracking-[1.4px] text-[#6378b3] bg-white/70 border border-white rounded-full px-4 py-2 shadow-sm mb-4">
              CREATE 모형 연구학교 · 성과공유 3D 서재 [교과전담 수업지도안]
            </span>

            {/* Hero Title */}
            <h1 className="text-[32px] sm:text-[46px] leading-[1.38] tracking-[-1.8px] text-[#34476a] font-black mb-3">
              수업의 변화를 여는 <span className="text-[#687de0]">CREATE 모형</span>
              <br />
              교과전담 수업지도안
            </h1>

            {/* Hero Subtitle */}
            <p className="text-[14px] sm:text-[15px] leading-[1.8] text-[#697b98] mb-6 font-normal">
              연구학교에서 실천하고 검증한 교과전담 수업지도안을 실제 종이책처럼
              <br className="hidden sm:inline" /> 한 페이지씩 넘기며 생생하게 읽을 수 있는 온라인 3D 전자책 서재입니다.
            </p>

            {/* Chips */}
            <div className="flex justify-center gap-2 sm:gap-2.5 flex-wrap mt-7">
              {['영어 전담', '체육 전담', '과학 전담', '보건·통합', '단면 3D 플립북'].map(
                (chip) => (
                  <span
                    key={chip}
                    className="text-[11.5px] text-[#6d7f9d] font-extrabold bg-white/70 border border-white rounded-full px-3.5 py-1.5 shadow-sm"
                  >
                    {chip}
                  </span>
                )
              )}
            </div>
          </div>
        </section>

        {/* 2. Intro Strip (create.allforedu.kr feature bar) */}
        <div className="flex flex-col sm:flex-row items-center justify-between my-6 p-5 sm:px-7 rounded-[20px] bg-white border border-[#e8edf7] shadow-edu-strip gap-4">
          <div className="flex items-center gap-4 text-left w-full sm:w-auto">
            <div className="w-12 h-12 rounded-[14px] bg-[#eaf9f2] text-[#4aab82] flex items-center justify-center text-2xl shrink-0">
              🌱
            </div>
            <div>
              <strong className="text-[15px] font-extrabold text-[#34415c] block">
                CREATE 교과전담 수업지도안 및 교수학습 자료집
              </strong>
              <p className="text-[12px] text-[#8a96aa] mt-0.5">
                모든 전자책은 로그인 없이 PC, 태블릿, 스마트폰에서 즉시 한 페이지씩 열람 가능합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[12px] text-[#8a97af] font-extrabold shrink-0 self-end sm:self-center">
            <span>등록된 자료</span>
            <strong className="text-[26px] text-[#6d81d7] font-sans font-black">16</strong>
            <span>권</span>
          </div>
        </div>

        {/* 3. Section Title Area */}
        <div className="mt-10 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
          <div>
            <div className="text-[11px] tracking-[1.7px] text-[#91a0d0] font-black uppercase">
              TEACHING & LEARNING ARCHIVE
            </div>
            <h2 className="text-[26px] sm:text-[30px] font-black text-[#33445f] tracking-[-1.2px] mt-1 mb-1">
              연구학교 교수학습 제작자료 <span className="text-[#e3a7d1]">✦</span>
            </h2>
            <p className="text-[13px] text-[#8996aa]">
              CREATE 모형 기반 단원 설계안 모음입니다.
            </p>
          </div>

          <div className="text-[12px] font-extrabold text-[#7b8db3] bg-[#eaf0ff] rounded-full px-3.5 py-2 whitespace-nowrap self-start sm:self-auto">
            총 {books.length}건의 자료
          </div>
        </div>

        {/* 4. Controls: Categories & Search */}
        <div className="mb-8">
          <CategoryBar
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortOption={sortOption}
            onSortChange={setSortOption}
            totalCount={books.length}
          />
        </div>

        {/* 5. Loading State */}
        {isLoading && (
          <div className="py-24 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-[#687fe0] animate-spin mb-3" />
            <p className="text-[#8a96aa] text-sm font-bold">연구학교 자료 목록을 불러오는 중입니다...</p>
          </div>
        )}

        {/* 6. Error State */}
        {isError && (
          <div className="py-16 text-center max-w-md mx-auto">
            <div className="p-6 bg-white border border-[#e8edf6] rounded-[23px] shadow-edu-card">
              <AlertCircle className="w-8 h-8 text-[#e06b98] mx-auto mb-2" />
              <p className="text-sm font-extrabold text-[#34415c] mb-1">자료 목록을 가져오지 못했습니다</p>
              <p className="text-xs text-[#8a96aa] mb-4">{(error as any)?.message || '네트워크 오류'}</p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-[#687fe0] hover:bg-[#566ecf] text-white rounded-[13px] text-xs font-bold transition shadow-sm"
              >
                다시 시도
              </button>
            </div>
          </div>
        )}

        {/* 7. Empty State */}
        {!isLoading && !isError && books.length === 0 && (
          <div className="text-center py-16 px-6 bg-white border border-dashed border-[#cdd7eb] rounded-[23px] my-6">
            <span className="text-4xl block mb-2">🔍</span>
            <h3 className="text-base font-extrabold text-[#34415c] mb-1">검색된 교수학습 자료가 없습니다</h3>
            <p className="text-xs text-[#8a96aa] mb-5">
              다른 검색어를 입력하시거나 카테고리 필터를 '전체'로 변경해 보세요.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('전체');
                setSearchQuery('');
              }}
              className="px-5 py-2.5 bg-[#687fe0] text-white rounded-[13px] text-xs font-bold hover:bg-[#566ecf] transition shadow-edu-btn"
            >
              필터 초기화
            </button>
          </div>
        )}

        {/* 8. Card Grid (Exact create.allforedu.kr 3-column Layout) */}
        {!isLoading && !isError && books.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[18px]">
            {books.map((book, index) => (
              <BookCard
                key={book.id}
                book={book}
                index={index}
                onRead={handleOpenBook}
              />
            ))}
          </div>
        )}

        {/* 9. About / External Link Banner (create.allforedu.kr style) */}
        <section className="mt-16 p-7 sm:p-8 rounded-[24px] bg-gradient-to-r from-[#eaf2ff] to-[#f5f0ff] border border-[#e0e8fa] flex flex-col sm:flex-row items-center gap-5">
          <div className="w-14 h-14 rounded-[17px] bg-white text-[#687fe0] flex items-center justify-center text-3xl shadow-sm shrink-0">
            🎨
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-[18px] font-black text-[#34415c] mb-1">
              CREATE 모형 연구학교 온라인 플랫폼
            </h3>
            <p className="text-[12.5px] text-[#7c8ba6] leading-[1.8]">
              본 플랫폼의 모든 단원설계안과 수업 지도안은 교실 실증수업을 바탕으로 제작되었습니다.
              더 많은 자료와 연구학교 실천 사례는 공식 성과공유 플랫폼에서 확인하실 수 있습니다.
            </p>
          </div>
          <a
            href="https://create.allforedu.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-[13px] bg-white text-[#6077d1] hover:text-[#4b63be] border border-[#dbe4fa] text-xs font-extrabold flex items-center gap-1.5 shadow-sm shrink-0 hover:bg-[#f8faff] transition"
          >
            <span>홈 화면으로 돌아가기</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </section>
      </div>

      {/* Preparing Viewer Modal */}
      {isPreparingViewer && (
        <div className="fixed inset-0 z-50 bg-[#26314e]/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-7 rounded-[24px] flex flex-col items-center shadow-2xl border border-[#e8edf7]">
            <Loader2 className="w-9 h-9 text-[#687fe0] animate-spin mb-3" />
            <p className="text-sm font-extrabold text-[#34415c]">3D 단면 뷰어 엔진 로딩 중...</p>
          </div>
        </div>
      )}

      {/* Fullscreen 3D FlipBook Viewer */}
      {activeReadingBook && activePdfUrl && (
        <FlipBookViewer
          pdfUrl={activePdfUrl}
          title={activeReadingBook.title}
          onClose={handleCloseViewer}
        />
      )}

      {/* Footer (create.allforedu.kr style) */}
      <footer className="mt-auto border-t border-[#e9edf7] bg-white/90 py-8 text-xs text-[#8996ab]">
        <div className="max-w-[1160px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <strong className="text-[13px] text-[#617392] block font-bold">
              2026 교육부 요청 전북특별자치도교육청 AI 디지털 활용 연구학교 군산초등학교
            </strong>
            <p className="mt-1 text-[11px] text-[#8996aa]">
              Copyrightⓒ 군산초등학교. All rights reserved
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold text-[#4aab82] bg-[#eaf9f2] px-3 py-1.5 rounded-full border border-[#d2f3e4]">
              ✓ Cloudflare Edge Optimized
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
