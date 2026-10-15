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
}

export interface BookUpdatePayload {
  title?: string;
  description?: string;
  category?: string;
  is_published?: boolean;
  cover_file?: File | Blob;
}

export type CategoryOption = 
  | '전체'
  | '수업설계 길잡이'
  | '1·2학년'
  | '3·4학년'
  | '5·6학년'
  | '전담교과';

export const CATEGORIES: CategoryOption[] = [
  '전체',
  '수업설계 길잡이',
  '1·2학년',
  '3·4학년',
  '5·6학년',
  '전담교과'
];
