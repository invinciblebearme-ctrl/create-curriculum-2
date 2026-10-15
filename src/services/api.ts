import { Book, BookListResponse, BookUploadPayload, BookUpdatePayload } from '../types/book';
import { generateCoverFromPdf, resolveAssetUrl } from '../lib/pdfUtils';
import { getOrGenerateThumbnail, generateCreateBookSvgCover } from '../lib/thumbnailManager';

const STORAGE_KEY = 'cf_3d_flipbook_specialist_v2';
const PDF_BLOB_STORAGE = new Map<string, Blob>();
const COVER_DATA_STORAGE = new Map<string, string>();

// 2번 서재: CREATE모형 교과전담 수업지도안 및 길잡이 도서 목록 (총 10종)
const INITIAL_BOOKS: Book[] = [
  {
    id: "create-doc-1",
    title: "CREATE 수업설계 모형 길잡이",
    description: "CREATE 수업설계 모형의 기본 개념과 설계 전략 가이드북입니다.",
    category: "수업설계 길잡이",
    pdf_key: "/pdf/CREATE%20%EC%88%98%EC%97%85%EC%84%A4%EA%B3%84%20%EB%AA%A8%ED%98%95%20%EA%B8%B8%EC%9E%A1%EC%9D%B4.pdf",
    cover_key: "covers/create-doc-1/cover.jpg",
    file_size: 4786542,
    page_count: 36,
    is_published: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "create-doc-4",
    title: "CREATE모형 단원설계안_통합 전담수업_2학년",
    description: "2학년 통합 교과 전담수업 CREATE 모형 단원 설계안입니다.",
    category: "보건·통합",
    pdf_key: "/pdf/CREATE%EB%AA%A8%ED%98%95%20%EB%8B%A8%EC%9B%90%EC%84%A4%EA%B3%84%EC%95%88_%ED%86%B5%ED%95%A9%20%EC%A0%84%EB%8B%B4%EC%88%98%EC%97%85_2%ED%95%99%EB%85%84.pdf",
    cover_key: "covers/create-doc-4/cover.jpg",
    file_size: 162009,
    page_count: 8,
    is_published: 1,
    created_at: new Date(Date.now() - 3000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "create-doc-7",
    title: "CREATE모형 단원설계안_영어 전담수업_4학년",
    description: "4학년 영어 전담수업 CREATE 모형 단원 설계안입니다.",
    category: "영어",
    pdf_key: "/pdf/CREATE%EB%AA%A8%ED%98%95%20%EB%8B%A8%EC%9B%90%EC%84%A4%EA%B3%84%EC%95%88_%EC%98%81%EC%96%B4%20%EC%A0%84%EB%8B%B4%EC%88%98%EC%97%85_4%ED%95%99%EB%85%84.pdf",
    cover_key: "covers/create-doc-7/cover.jpg",
    file_size: 161755,
    page_count: 8,
    is_published: 1,
    created_at: new Date(Date.now() - 6000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "create-doc-8",
    title: "CREATE모형 단원설계안_체육 전담수업_4학년",
    description: "4학년 체육 전담수업 CREATE 모형 단원 설계안입니다.",
    category: "체육",
    pdf_key: "/pdf/CREATE%EB%AA%A8%ED%98%95%20%EB%8B%A8%EC%9B%90%EC%84%A4%EA%B3%84%EC%95%88_%EC%B2%B4%EC%9C%A1%20%EC%A0%84%EB%8B%B4%EC%88%98%EC%97%85_4%ED%95%99%EB%85%84.pdf",
    cover_key: "covers/create-doc-8/cover.jpg",
    file_size: 143598,
    page_count: 8,
    is_published: 1,
    created_at: new Date(Date.now() - 7000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "create-doc-10",
    title: "CREATE모형 단원설계안_과학 전담수업_5학년",
    description: "5학년 과학 전담수업 CREATE 모형 단원 설계안입니다.",
    category: "과학",
    pdf_key: "/pdf/CREATE%EB%AA%A8%ED%98%95%20%EB%8B%A8%EC%9B%90%EC%84%A4%EA%B3%84%EC%95%88_%EA%B3%BC%ED%95%99%20%EC%A0%84%EB%8B%B4%EC%88%98%EC%97%85_5%ED%95%99%EB%85%84.pdf",
    cover_key: "covers/create-doc-10/cover.jpg",
    file_size: 160590,
    page_count: 8,
    is_published: 1,
    created_at: new Date(Date.now() - 9000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "create-doc-11",
    title: "CREATE모형 단원설계안_영어 전담수업_5학년",
    description: "5학년 영어 전담수업 CREATE 모형 단원 설계안입니다.",
    category: "영어",
    pdf_key: "/pdf/CREATE%EB%AA%A8%ED%98%95%20%EB%8B%A8%EC%9B%90%EC%84%A4%EA%B3%84%EC%95%88_%EC%98%81%EC%96%B4%20%EC%A0%84%EB%8B%B4%EC%88%98%EC%97%85_5%ED%95%99%EB%85%84.pdf",
    cover_key: "covers/create-doc-11/cover.jpg",
    file_size: 133150,
    page_count: 8,
    is_published: 1,
    created_at: new Date(Date.now() - 10000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "create-doc-12",
    title: "CREATE모형 단원설계안_보건_5학년",
    description: "5학년 보건 교과 CREATE 모형 단원 설계안입니다.",
    category: "보건·통합",
    pdf_key: "/pdf/CREATE%EB%AA%A8%ED%98%95%20%EB%8B%A8%EC%9B%90%EC%84%A4%EA%B3%84%EC%95%88_%EB%B3%B4%EA%B1%B4_5%ED%95%99%EB%85%84.pdf",
    cover_key: "covers/create-doc-12/cover.jpg",
    file_size: 97790,
    page_count: 6,
    is_published: 1,
    created_at: new Date(Date.now() - 11000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "create-doc-14",
    title: "CREATE모형 단원설계안_과학 전담수업_6학년",
    description: "6학년 과학 전담수업 CREATE 모형 단원 설계안입니다.",
    category: "과학",
    pdf_key: "/pdf/CREATE%EB%AA%A8%ED%98%95%20%EB%8B%A8%EC%9B%90%EC%84%A4%EA%B3%84%EC%95%88_%EA%B3%BC%ED%95%99%20%EC%A0%84%EB%8B%B4%EC%88%98%EC%97%85_6%ED%95%99%EB%85%84.pdf",
    cover_key: "covers/create-doc-14/cover.jpg",
    file_size: 136010,
    page_count: 8,
    is_published: 1,
    created_at: new Date(Date.now() - 13000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "create-doc-15",
    title: "CREATE모형 단원설계안_영어 전담수업_6학년",
    description: "6학년 영어 전담수업 CREATE 모형 단원 설계안입니다.",
    category: "영어",
    pdf_key: "/pdf/CREATE%EB%AA%A8%ED%98%95%20%EB%8B%A8%EC%9B%90%EC%84%A4%EA%B3%84%EC%95%88_%EC%98%81%EC%96%B4%20%EC%A0%84%EB%8B%B4%EC%88%98%EC%97%85_6%ED%95%99%EB%85%84.pdf",
    cover_key: "covers/create-doc-15/cover.jpg",
    file_size: 156506,
    page_count: 8,
    is_published: 1,
    created_at: new Date(Date.now() - 14000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "create-doc-16",
    title: "CREATE모형 단원설계안_체육 전담수업_6학년",
    description: "6학년 체육 전담수업 CREATE 모형 단원 설계안입니다.",
    category: "체육",
    pdf_key: "/pdf/CREATE%EB%AA%A8%ED%98%95%20%EB%8B%A8%EC%9B%90%EC%84%A4%EA%B3%84%EC%95%88_%EC%B2%B4%EC%9C%A1%20%EC%A0%84%EB%8B%B4%EC%88%98%EC%97%85_6%ED%95%99%EB%85%84.pdf",
    cover_key: "covers/create-doc-16/cover.jpg",
    file_size: 123432,
    page_count: 8,
    is_published: 1,
    created_at: new Date(Date.now() - 15000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

function getStoredBooks(): Book[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BOOKS));
      return INITIAL_BOOKS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_BOOKS;
  }
}

function saveStoredBooks(books: Book[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  } catch (e) {
    console.error('LocalStorage 저장 오류:', e);
  }
}

const ADMIN_PASSWORD_KEY = 'create_curriculum2_admin_pw';

export function getAdminPassword(): string {
  try {
    return sessionStorage.getItem(ADMIN_PASSWORD_KEY) || localStorage.getItem(ADMIN_PASSWORD_KEY) || '';
  } catch {
    return '';
  }
}

export function setAdminPassword(password: string): void {
  try {
    sessionStorage.setItem(ADMIN_PASSWORD_KEY, password);
    localStorage.setItem(ADMIN_PASSWORD_KEY, password);
  } catch (e) {
    console.error('Failed to save admin password:', e);
  }
}

export function clearAdminPassword(): void {
  try {
    sessionStorage.removeItem(ADMIN_PASSWORD_KEY);
    localStorage.removeItem(ADMIN_PASSWORD_KEY);
  } catch (e) {
    console.error('Failed to clear admin password:', e);
  }
}

let isDevAdminActive = true;

export function setDevAdminMode(enabled: boolean) {
  isDevAdminActive = enabled;
}

export function isDevAdminEnabled(): boolean {
  return isDevAdminActive;
}

async function requestApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  const currentPassword = getAdminPassword();
  if (currentPassword) {
    headers.set('x-admin-password', currentPassword);
  }
  if (isDevAdminActive) {
    headers.set('x-dev-admin', 'true');
  }

  const res = await fetch(url, { credentials: 'include', ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const json = JSON.parse(text);
      msg = json.error || text;
    } catch { }
    throw new Error(msg || `API 오류: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ----------------------------------------------------
// Public APIs
// ----------------------------------------------------

export async function fetchBooks(params: {
  category?: string;
  q?: string;
  sort?: 'latest' | 'title';
}): Promise<BookListResponse> {
  try {
    const searchParams = new URLSearchParams();
    if (params.category && params.category !== '전체') searchParams.set('category', params.category);
    if (params.q) searchParams.set('q', params.q);
    if (params.sort) searchParams.set('sort', params.sort);

    return await requestApi<BookListResponse>(`/api/books?${searchParams.toString()}`);
  } catch {
    let books = getStoredBooks().filter((b) => b.is_published === 1);

    if (params.category && params.category !== '전체') {
      books = books.filter((b) => b.category === params.category);
    }
    if (params.q) {
      const q = params.q.toLowerCase();
      books = books.filter((b) => b.title.toLowerCase().includes(q) || (b.description && b.description.toLowerCase().includes(q)));
    }
    if (params.sort === 'title') {
      books.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      books.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return { books, total: books.length };
  }
}

export async function fetchBookById(id: string): Promise<Book> {
  try {
    return await requestApi<Book>(`/api/books/${id}`);
  } catch {
    const books = getStoredBooks();
    const book = books.find((b) => b.id === id);
    if (!book) throw new Error('도서를 찾을 수 없습니다.');
    return book;
  }
}

export async function getPdfBlobUrl(id: string): Promise<string> {
  const books = getStoredBooks();
  const book = books.find((b) => b.id === id);

  // If local static PDF file path (/pdf/...)
  if (book && book.pdf_key && book.pdf_key.startsWith('/pdf/')) {
    return resolveAssetUrl(book.pdf_key);
  }

  // Uploaded blob in memory
  const cachedBlob = PDF_BLOB_STORAGE.get(id);
  if (cachedBlob) {
    return URL.createObjectURL(cachedBlob);
  }

  // Try real API endpoint
  try {
    const res = await fetch(`/api/books/${id}/pdf`, {
      headers: isDevAdminActive ? { 'x-dev-admin': 'true' } : {},
    });
    if (res.ok) {
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    }
  } catch { }

  // Fallback to public PDF if available
  if (book?.pdf_key) {
    return resolveAssetUrl(book.pdf_key);
  }

  throw new Error('PDF 파일을 찾을 수 없습니다.');
}

export async function getCoverImageUrl(book: Book): Promise<string> {
  const localCover = COVER_DATA_STORAGE.get(book.id);
  if (localCover) return localCover;

  // 1. Try real API first
  try {
    const res = await fetch(`/api/books/${book.id}/cover`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      COVER_DATA_STORAGE.set(book.id, url);
      return url;
    }
  } catch { }

  // 2. Determine PDF source url
  let pdfSourceUrl = book.pdf_key;
  if (PDF_BLOB_STORAGE.has(book.id)) {
    const blob = PDF_BLOB_STORAGE.get(book.id)!;
    pdfSourceUrl = URL.createObjectURL(blob);
  } else if (pdfSourceUrl && pdfSourceUrl.startsWith('/pdf/')) {
    pdfSourceUrl = resolveAssetUrl(pdfSourceUrl);
  }

  // 3. Try to get or generate thumbnail via queue
  const generatedCover = await getOrGenerateThumbnail(book.id, pdfSourceUrl);
  if (generatedCover) {
    COVER_DATA_STORAGE.set(book.id, generatedCover);
    return generatedCover;
  }

  // 4. Instant high-quality CREATE official SVG cover fallback
  const svgCover = generateCreateBookSvgCover(book.title, book.category);
  COVER_DATA_STORAGE.set(book.id, svgCover);
  return svgCover;
}

// ----------------------------------------------------
// Admin APIs
// ----------------------------------------------------

export async function verifyAdmin(passwordCandidate?: string): Promise<{ authenticated: boolean; user?: any; error?: string }> {
  const currentPassword = passwordCandidate !== undefined ? passwordCandidate : getAdminPassword();

  if (passwordCandidate) {
    setAdminPassword(passwordCandidate);
  }

  // 1. Try real server verify endpoint (POST with password body & header)
  try {
    const res = await fetch('/api/admin/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': currentPassword || '',
      },
      body: JSON.stringify({ password: currentPassword }),
    });

    if (res.ok) {
      const data = await res.json() as any;
      if (data.authenticated) {
        setAdminPassword(currentPassword);
        return { authenticated: true, user: data.user || { email: 'admin@school.ed.kr' } };
      }
    }
  } catch { }

  // 2. Client Fallback Verification using Secure SHA-256 Hash
  // Eliminates plain-text password from compiled client bundles
  const ADMIN_PWD_HASH = '706a70c1f003240fa9abcf1a0d47610647d7d438719b2f5cd6d56505dc9ffdc5';
  let inputHash = '';
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(currentPassword || '');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    inputHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch { }

  if (inputHash && inputHash === ADMIN_PWD_HASH) {
    setAdminPassword(currentPassword);
    return {
      authenticated: true,
      user: { email: 'admin@school.ed.kr', sub: 'admin-authorized-session' },
    };
  }

  // If wrong password provided
  if (currentPassword) {
    return {
      authenticated: false,
      error: '관리자 비밀번호가 올바르지 않습니다.',
    };
  }

  // 3. Fallback when no password provided
  return {
    authenticated: false,
    error: '관리자 비밀번호를 입력해주세요.',
  };
}

export async function fetchAdminBooks(): Promise<BookListResponse> {
  try {
    return await requestApi<BookListResponse>(`/api/admin/books`);
  } catch {
    const books = getStoredBooks();
    return { books, total: books.length };
  }
}

export async function uploadBook(payload: BookUploadPayload): Promise<Book> {
  try {
    const formData = new FormData();
    formData.append('title', payload.title);
    formData.append('description', payload.description);
    formData.append('category', payload.category);
    formData.append('is_published', payload.is_published ? '1' : '0');
    formData.append('pdf_file', payload.pdf_file);
    if (payload.cover_file) {
      formData.append('cover_file', payload.cover_file);
    }

    const headers: Record<string, string> = {};
    const pw = getAdminPassword();
    if (pw) headers['x-admin-password'] = pw;
    if (isDevAdminActive) headers['x-dev-admin'] = 'true';

    const res = await fetch('/api/admin/books', {
      method: 'POST',
      body: formData,
      headers,
    });
    if (!res.ok) {
      const err = await res.json() as any;
      throw new Error(err.error || '업로드 실패');
    }
    const data = await res.json() as any;
    return data.book;
  } catch {
    // Local fallback upload
    const newId = 'create-doc-' + Date.now();
    let pageCount = 1;
    let coverUrl = '';

    try {
      const extracted = await generateCoverFromPdf(payload.pdf_file);
      pageCount = extracted.pageCount;
      coverUrl = extracted.coverDataUrl;
    } catch { }

    if (payload.cover_file) {
      coverUrl = URL.createObjectURL(payload.cover_file);
    }

    PDF_BLOB_STORAGE.set(newId, payload.pdf_file);
    if (coverUrl) {
      COVER_DATA_STORAGE.set(newId, coverUrl);
    }

    const newBook: Book = {
      id: newId,
      title: payload.title,
      description: payload.description,
      category: payload.category,
      pdf_key: `books/${newId}/document.pdf`,
      cover_key: `covers/${newId}/cover.jpg`,
      file_size: payload.pdf_file.size,
      page_count: pageCount,
      is_published: payload.is_published ? 1 : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const books = [newBook, ...getStoredBooks()];
    saveStoredBooks(books);
    return newBook;
  }
}

export async function updateBook(id: string, payload: BookUpdatePayload): Promise<Book> {
  try {
    return await requestApi<Book>(`/api/admin/books/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    const books = getStoredBooks();
    const index = books.findIndex((b) => b.id === id);
    if (index === -1) throw new Error('도서를 찾을 수 없습니다.');

    const updated: Book = {
      ...books[index],
      ...payload,
      is_published: payload.is_published !== undefined ? (payload.is_published ? 1 : 0) : books[index].is_published,
      updated_at: new Date().toISOString(),
    };

    if (payload.cover_file) {
      const url = URL.createObjectURL(payload.cover_file);
      COVER_DATA_STORAGE.set(id, url);
    }

    books[index] = updated;
    saveStoredBooks(books);
    return updated;
  }
}

export async function deleteBook(id: string): Promise<void> {
  try {
    await requestApi(`/api/admin/books/${id}`, { method: 'DELETE' });
  } catch {
    const books = getStoredBooks().filter((b) => b.id !== id);
    saveStoredBooks(books);
    PDF_BLOB_STORAGE.delete(id);
    COVER_DATA_STORAGE.delete(id);
  }
}
