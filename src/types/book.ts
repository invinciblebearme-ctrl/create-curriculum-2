export interface Book {
  id: string;
  title: string;
  description: string;
  category: string;
  pdf_key: string;
  cover_key: string;
  file_size: number;
  page_count: number;
  is_published: number; // 0 or 1
  emoji?: string;
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

export interface BookListResponse {
  books: Book[];
  total: number;
}

export interface BookUploadPayload {
  title: string;
  description: string;
  category: string;
  is_published: boolean;
  pdf_file: File;
  cover_file?: File | Blob;
  emoji?: string;
  sort_order?: number;
  page_count?: number;
}

export interface BookUpdatePayload {
  title?: string;
  description?: string;
  category?: string;
  is_published?: boolean;
  cover_file?: File | Blob;
  pdf_file?: File;
  emoji?: string;
  sort_order?: number;
  page_count?: number;
}

export const PRESET_EMOJIS = [
  '📖', '🎨', '🌱', '💡', '✨', '🧭', '🔬', '📐',
  '📝', '🚀', '🌟', '📚', '🎯', '🏅', '🧩', '🧪',
  '🎵', '⚽', '🌿', '💼', '💻', '🌏', '🏷️', '📌', '🔤'
];

export type CategoryOption = 
  | '전체'
  | '수업설계 길잡이'
  | '영어'
  | '체육'
  | '과학'
  | '보건·통합';

export const CATEGORIES: CategoryOption[] = [
  '전체',
  '수업설계 길잡이',
  '영어',
  '체육',
  '과학',
  '보건·통합'
];
