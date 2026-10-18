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
    emoji: "📖",
    sort_order: 1,
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
    emoji: "🎨",
    sort_order: 2,
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
    emoji: "🔤",
    sort_order: 3,
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
    emoji: "⚽",
    sort_order: 4,
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
    emoji: "🔬",
    sort_order: 5,
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
    emoji: "🌏",
    sort_order: 6,
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
    emoji: "🌱",
    sort_order: 7,
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
    emoji: "🧪",
    sort_order: 8,
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
    emoji: "💡",
    sort_order: 9,
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
    emoji: "🏅",
    sort_order: 10,
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
    const parsed: Book[] = JSON.parse(raw);
    let changed = false;
    const enriched = parsed.map((book, idx) => {
      const initMatch = INITIAL_BOOKS.find((b) => b.id === book.id);
      let updated = { ...book };
      if (!updated.emoji) {
        updated.emoji = initMatch?.emoji || '📖';
        changed = true;
      }
      if (updated.sort_order === undefined) {
        updated.sort_order = initMatch?.sort_order ?? (idx + 1);
        changed = true;
      }
      return updated;
    });
    enriched.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
    if (changed) {
      saveStoredBooks(enriched);
    }
    return enriched;
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

const ADMIN_PASSWORD_KEY = 'future_curriculum2_admin_pw';

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

export const getApiEndpoint = (endpoint: string): string => {
  const clean = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/curriculum2')) {
    return '/curriculum2' + clean;
  }
  return clean;
};

let isDevAdminActive = true;

export function setDevAdminMode(enabled: boolean) {
  isDevAdminActive = enabled;
}

export function isDevAdminEnabled(): boolean {
  return isDevAdminActive;
}

async function requestApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const targetUrl = getApiEndpoint(url);
  const headers = new Headers(options.headers || {});
  const currentPassword = getAdminPassword();
  if (currentPassword) {
    headers.set('x-admin-password', currentPassword);
  }
  if (isDevAdminActive) {
    headers.set('x-dev-admin', 'true');
  }

  const res = await fetch(targetUrl, { credentials: 'include', ...options, headers });
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

export async function fetchBooks(params: {
  category?: string;
  q?: string;
  sort?: 'order' | 'latest' | 'title';
}): Promise<BookListResponse> {
  try {
    const searchParams = new URLSearchParams();
    if (params.category && params.category !== '전체') searchParams.set('category', params.category);
    if (params.q) searchParams.set('q', params.q);
    if (params.sort) searchParams.set('sort', params.sort);

    const data = await requestApi<BookListResponse>(`/api/books?${searchParams.toString()}`);
    if (data?.books && (!params.category || params.category === '전체') && !params.q) {
      saveStoredBooks(data.books);
    }
    return data;
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
    } else if (params.sort === 'latest') {
      books.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      books.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
    }

    return { books, total: books.length };
  }
}

export async function fetchBookById(id: string): Promise<Book> {
  try {
    return await requestApi<Book>(`/api/books/${id}`);
  } catch {
    const books = getStoredBooks();
    const book = books.find((b) => b.id === id) || INITIAL_BOOKS.find((b) => b.id === id);
    if (!book) throw new Error('도서를 찾을 수 없습니다.');
    return book;
  }
}

export async function getPdfBlobUrl(id: string): Promise<string> {
  // 1. Uploaded blob in memory
  const cachedBlob = PDF_BLOB_STORAGE.get(id);
  if (cachedBlob) {
    return URL.createObjectURL(cachedBlob);
  }

  // 2. Try real API streaming endpoint
  try {
    const res = await fetch(getApiEndpoint(`/api/books/${id}/pdf`), {
      headers: isDevAdminActive ? { 'x-dev-admin': 'true' } : {},
    });
    if (res.ok) {
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    }
  } catch { }

  // 3. Fallback to static asset URL
  const books = getStoredBooks();
  const book = books.find((b) => b.id === id) || INITIAL_BOOKS.find((b) => b.id === id);
  if (book?.pdf_key) {
    const assetUrl = resolveAssetUrl(book.pdf_key);
    try {
      const res = await fetch(assetUrl);
      if (res.ok) {
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      }
    } catch { }

    // Fallback: try alternate encoding (decoded vs encoded)
    try {
      const altKey = book.pdf_key.includes('%') ? decodeURIComponent(book.pdf_key) : encodeURI(book.pdf_key);
      const altUrl = resolveAssetUrl(altKey);
      const res2 = await fetch(altUrl);
      if (res2.ok) {
        const blob = await res2.blob();
        return URL.createObjectURL(blob);
      }
    } catch { }

    return assetUrl;
  }

  throw new Error('PDF 파일을 찾을 수 없습니다.');
}

export async function getCoverImageUrl(book: Book): Promise<string> {
  const localCover = COVER_DATA_STORAGE.get(book.id);
  if (localCover) return localCover;

  try {
    const res = await fetch(getApiEndpoint(`/api/books/${book.id}/cover`));
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      COVER_DATA_STORAGE.set(book.id, url);
      return url;
    }
  } catch { }

  let pdfSourceUrl = book.pdf_key;
  if (PDF_BLOB_STORAGE.has(book.id)) {
    const blob = PDF_BLOB_STORAGE.get(book.id)!;
    pdfSourceUrl = URL.createObjectURL(blob);
  } else if (pdfSourceUrl && pdfSourceUrl.startsWith('/pdf/')) {
    pdfSourceUrl = resolveAssetUrl(pdfSourceUrl);
  }

  const generatedCover = await getOrGenerateThumbnail(book.id, pdfSourceUrl);
  if (generatedCover) {
    COVER_DATA_STORAGE.set(book.id, generatedCover);
    return generatedCover;
  }

  const svgCover = generateCreateBookSvgCover(book.title, book.category);
  COVER_DATA_STORAGE.set(book.id, svgCover);
  return svgCover;
}

export async function verifyAdmin(passwordCandidate?: string): Promise<{ authenticated: boolean; user?: any; error?: string }> {
  const currentPassword = passwordCandidate !== undefined ? passwordCandidate : getAdminPassword();

  if (passwordCandidate) {
    setAdminPassword(passwordCandidate);
  }

  try {
    const res = await fetch(getApiEndpoint('/api/admin/auth/verify'), {
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

  if (currentPassword) {
    return {
      authenticated: false,
      error: '관리자 비밀번호가 올바르지 않습니다.',
    };
  }

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
    if (payload.emoji) formData.append('emoji', payload.emoji);
    if (payload.sort_order !== undefined) formData.append('sort_order', String(payload.sort_order));
    if (payload.cover_file) {
      formData.append('cover_file', payload.cover_file);
    }

    const headers: Record<string, string> = {};
    const pw = getAdminPassword();
    if (pw) headers['x-admin-password'] = pw;
    if (isDevAdminActive) headers['x-dev-admin'] = 'true';

    const res = await fetch(getApiEndpoint('/api/admin/books'), {
      method: 'POST',
      body: formData,
      headers,
    });
    if (!res.ok) {
      const err = await res.json() as any;
      throw new Error(err.error || '업로드 실패');
    }
    const data = await res.json() as any;
    const newBook = data.book;

    const books = [newBook, ...getStoredBooks()];
    saveStoredBooks(books);
    return newBook;
  } catch {
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

    const existingBooks = getStoredBooks();
    const newBook: Book = {
      id: newId,
      title: payload.title,
      description: payload.description,
      category: payload.category,
      emoji: payload.emoji || '📖',
      sort_order: payload.sort_order ?? (existingBooks.length + 1),
      pdf_key: `books/${newId}/document.pdf`,
      cover_key: `covers/${newId}/cover.jpg`,
      file_size: payload.pdf_file.size,
      page_count: pageCount,
      is_published: payload.is_published ? 1 : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const books = [newBook, ...existingBooks];
    saveStoredBooks(books);
    return newBook;
  }
}

export async function updateBook(id: string, payload: BookUpdatePayload): Promise<Book> {
  const hasFile = !!(payload.pdf_file || payload.cover_file);
  try {
    let updated: Book;
    if (hasFile) {
      const formData = new FormData();
      if (payload.title !== undefined) formData.append('title', payload.title);
      if (payload.description !== undefined) formData.append('description', payload.description);
      if (payload.category !== undefined) formData.append('category', payload.category);
      if (payload.is_published !== undefined) formData.append('is_published', payload.is_published ? '1' : '0');
      if (payload.emoji !== undefined) formData.append('emoji', payload.emoji);
      if (payload.sort_order !== undefined) formData.append('sort_order', String(payload.sort_order));
      if (payload.pdf_file) formData.append('pdf_file', payload.pdf_file);
      if (payload.cover_file) formData.append('cover_file', payload.cover_file);
      if (payload.page_count !== undefined) formData.append('page_count', String(payload.page_count));

      const headers: Record<string, string> = {};
      const pw = getAdminPassword();
      if (pw) headers['x-admin-password'] = pw;
      if (isDevAdminActive) headers['x-dev-admin'] = 'true';

      const res = await fetch(getApiEndpoint(`/api/admin/books/${id}`), {
        method: 'PUT',
        body: formData,
        headers,
      });
      if (!res.ok) {
        const err = await res.json() as any;
        throw new Error(err.error || '수정 실패');
      }
      const data = await res.json() as any;
      updated = data.book;
    } else {
      updated = await requestApi<Book>(`/api/admin/books/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    if (payload.pdf_file) {
      PDF_BLOB_STORAGE.set(id, payload.pdf_file);
    }
    if (payload.cover_file) {
      const url = URL.createObjectURL(payload.cover_file);
      COVER_DATA_STORAGE.set(id, url);
    }

    const books = getStoredBooks();
    const index = books.findIndex((b) => b.id === id);
    if (index !== -1) {
      books[index] = { ...books[index], ...updated };
      saveStoredBooks(books);
    }

    return updated;
  } catch {
    let books = getStoredBooks();
    let index = books.findIndex((b) => b.id === id);
    if (index === -1) {
      const seed = INITIAL_BOOKS.find((b) => b.id === id);
      if (seed) {
        books = [seed, ...books];
        index = 0;
      } else {
        throw new Error('도서를 찾을 수 없습니다.');
      }
    }

    let newFileSize = books[index].file_size;
    let newPageCount = books[index].page_count;

    if (payload.pdf_file) {
      PDF_BLOB_STORAGE.set(id, payload.pdf_file);
      newFileSize = payload.pdf_file.size;
      try {
        const extracted = await generateCoverFromPdf(payload.pdf_file);
        newPageCount = extracted.pageCount;
        if (!payload.cover_file) {
          COVER_DATA_STORAGE.set(id, extracted.coverDataUrl);
        }
      } catch { }
    }

    if (payload.cover_file) {
      const url = URL.createObjectURL(payload.cover_file);
      COVER_DATA_STORAGE.set(id, url);
    }

    const updated: Book = {
      ...books[index],
      ...payload,
      file_size: newFileSize,
      page_count: newPageCount,
      is_published: payload.is_published !== undefined ? (payload.is_published ? 1 : 0) : books[index].is_published,
      updated_at: new Date().toISOString(),
    };

    books[index] = updated;
    saveStoredBooks(books);
    return updated;
  }
}

export async function saveBooksOrder(orderedBooks: Book[]): Promise<void> {
  const updatedBooks = orderedBooks.map((b, idx) => ({
    ...b,
    sort_order: idx + 1,
  }));
  saveStoredBooks(updatedBooks);

  try {
    const payload = updatedBooks.map((b, idx) => ({ id: b.id, sort_order: idx + 1 }));
    await requestApi('/api/admin/books/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders: payload }),
    });
  } catch (e) {
    console.warn('서버 순서 동기화 실패 (로컬 스토리지에 정상 저장됨):', e);
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
