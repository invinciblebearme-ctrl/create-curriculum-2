import React, { useState, useEffect } from 'react';
import { Book } from '@/types/book';
import { getCoverImageUrl } from '@/services/api';
import { BookOpen, ExternalLink, Sparkles, Palette, BookCheck } from 'lucide-react';

interface BookCardProps {
  book: Book;
  index: number;
  onRead: (book: Book) => void;
  onDetail?: (book: Book) => void;
}

// create.allforedu.kr 아이콘 파스텔 틴트 매핑
function getCardTint(category: string, index: number) {
  const tints = [
    { bg: '#eaf2ff', color: '#687fe0', icon: '🎨' }, // blue
    { bg: '#e6f8ef', color: '#4aab82', icon: '🌱' }, // mint
    { bg: '#fff0e3', color: '#f5a623', icon: '💡' }, // peach
    { bg: '#f1ecff', color: '#7c63d8', icon: '📖' }, // lavender
    { bg: '#ffedf3', color: '#e06b98', icon: '✨' }, // pink
    { bg: '#e6f8fa', color: '#1db9a0', icon: '🧭' }, // aqua
  ];
  return tints[index % tints.length];
}

export const BookCard: React.FC<BookCardProps> = ({ book, index, onRead, onDetail }) => {
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [showCoverThumb, setShowCoverThumb] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    getCoverImageUrl(book).then((url) => {
      if (active) setCoverUrl(url);
    });
    return () => {
      active = false;
    };
  }, [book]);

  const tint = getCardTint(book.category, index);
  const contentNo = `CONTENT ${String(index + 1).padStart(2, '0')}`;

  return (
    <div className="bg-white border border-[#e8edf6] rounded-[23px] p-[23px] min-h-[330px] flex flex-col shadow-edu-card hover:shadow-edu-card-hover hover:-translate-y-1 transition-all duration-200 group relative">
      {/* 1. Card Top: Emoji Tint Box & Type Tag (Exact create.allforedu.kr match) */}
      <div className="flex items-center justify-between">
        <div
          className="w-[56px] h-[56px] rounded-[17px] flex items-center justify-center text-[28px] shadow-sm transition-transform duration-200 group-hover:scale-105 cursor-pointer"
          style={{ backgroundColor: tint.bg }}
          onClick={() => onRead(book)}
          title="클릭하여 3D 전자책 열기"
        >
          <span>{tint.icon}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#8490a8] bg-[#f4f6fb] rounded-full px-2.5 py-1.5 font-extrabold tracking-wide">
            {book.category}
          </span>
        </div>
      </div>

      {/* 2. Content No */}
      <div className="text-[10px] font-black text-[#a2acc2] tracking-[1.1px] mt-[20px] font-sans">
        {contentNo}
      </div>

      {/* 3. Title & Subtitle */}
      <h3
        onClick={() => onRead(book)}
        className="text-[17px] leading-[1.55] tracking-[-0.6px] my-1.5 text-[#34415c] font-extrabold cursor-pointer hover:text-[#687fe0] transition-colors line-clamp-2"
        title={book.title}
      >
        {book.title}
      </h3>

      <div className="text-[#6b7fd0] font-extrabold text-[12px] mb-2 font-sans flex items-center gap-1">
        <span>학년별 단원설계안 및 교수학습 자료</span>
      </div>

      {/* 4. Description */}
      <p className="text-[#8b97aa] text-[12px] leading-[1.8] mb-5 line-clamp-2">
        {book.description || 'CREATE 모형을 적용한 단원 설계안 및 실제 교실 수업 지도안 문서입니다.'}
      </p>

      {/* 5. Card Bottom (Matching create.allforedu.kr) */}
      <div className="mt-auto border-t border-[#edf0f6] pt-[15px] flex items-center justify-between gap-2">
        {/* Status: Ready */}
        <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#4aab82]">
          <span className="w-2 h-2 rounded-full bg-[#4aab82] inline-block animate-pulse" />
          <span>열람 가능 ({book.page_count}P)</span>
        </div>

        {/* Read / Detail Action Button */}
        <button
          onClick={() => onRead(book)}
          className="border-0 bg-transparent inline-flex items-center gap-1 text-[#6179d8] hover:text-[#566ecf] font-black text-[12px] hover:underline cursor-pointer py-1"
        >
          <span>3D 전자책 열기</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
