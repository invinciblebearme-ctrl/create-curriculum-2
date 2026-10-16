import React from 'react';
import { CATEGORIES } from '@/types/book';
import { Search, X, ArrowUpDown, Filter } from 'lucide-react';

interface CategoryBarProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortOption: 'order' | 'latest' | 'title';
  onSortChange: (sort: 'order' | 'latest' | 'title') => void;
  totalCount: number;
}

export const CategoryBar: React.FC<CategoryBarProps> = ({
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  totalCount,
}) => {
  return (
    <div className="space-y-4">
      {/* Search & Sort Controls Row (Matching create.allforedu.kr) */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Category Filters Pill List */}
        <div className="flex gap-2.5 flex-wrap items-center">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`border rounded-[13px] px-3.5 py-2.5 text-[13px] font-extrabold flex items-center gap-1.5 transition-all duration-150 ${
                  isActive
                    ? 'bg-[#687fe0] border-[#687fe0] text-white shadow-[0_6px_15px_rgba(104,127,224,0.23)] -translate-y-0.5'
                    : 'bg-white border-[#e4eaf5] text-[#67768e] hover:-translate-y-0.5 hover:text-[#30415e] shadow-sm'
                }`}
              >
                <span>{cat}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Search & Sort Box */}
        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="flex items-center gap-2 bg-white border border-[#e2e8f4] focus-within:border-[#8ba0ed] rounded-[13px] px-3 min-w-[240px] flex-1 md:flex-none shadow-sm transition-colors">
            <Search className="w-4 h-4 text-[#9aa7bd] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="단원설계안 검색..."
              className="h-[43px] w-full min-w-0 border-0 bg-transparent outline-none text-[12.5px] text-[#34425e] placeholder-[#9aa7bd]"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="text-[#9ca8bd] hover:text-[#34425e] p-1 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 px-3 py-2.5 bg-white border border-[#e2e8f4] rounded-[13px] text-xs font-extrabold text-[#67768e] shadow-sm shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#687fe0]" />
            <select
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value as 'order' | 'latest' | 'title')}
              className="bg-transparent focus:outline-none cursor-pointer pr-1 text-[#30415e] font-extrabold"
            >
              <option value="order">기본 순서</option>
              <option value="latest">최신순</option>
              <option value="title">가나다순</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Label */}
      <div className="flex justify-between items-center pt-2 text-[12px] text-[#8693a9] font-bold">
        <div>
          총 <strong className="text-[#6179db]">{totalCount}개</strong>의 학년별 단원설계안 자료
        </div>
        {(selectedCategory !== '전체' || searchQuery) && (
          <button
            onClick={() => {
              onSelectCategory('전체');
              onSearchChange('');
            }}
            className="text-[#7186cb] hover:underline"
          >
            초기화
          </button>
        )}
      </div>
    </div>
  );
};
