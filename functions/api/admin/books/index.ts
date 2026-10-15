import { Env } from '../../../types';
import { verifyAdminAuth } from '../../../middleware/auth';

// GET: 관리자용 전체 도서 목록
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const auth = await verifyAdminAuth(request, env);
  if (!auth.success) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status || 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'D1 데이터베이스가 바인딩되지 않았습니다.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { results } = await env.DB.prepare(
      'SELECT id, title, description, category, pdf_key, cover_key, file_size, page_count, is_published, created_at, updated_at FROM books ORDER BY created_at DESC'
    ).all();

    return new Response(JSON.stringify({ books: results || [], total: results?.length || 0 }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: '목록 조회 실패: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST: 신규 도서 업로드 및 메타데이터 생성
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const auth = await verifyAdminAuth(request, env);
  if (!auth.success) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status || 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!env.DB || !env.R2_BUCKET) {
    return new Response(JSON.stringify({ error: 'D1 데이터베이스 또는 R2 스토리지 바인딩이 누락되었습니다.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = (formData.get('description') as string) || '';
    const category = (formData.get('category') as string) || '기타';
    const isPublished = formData.get('is_published') === 'true' || formData.get('is_published') === '1' ? 1 : 0;
    const pageCount = parseInt((formData.get('page_count') as string) || '0', 10);

    const pdfFile = formData.get('pdf_file') as File;
    const coverFile = formData.get('cover_file') as File;

    if (!title || !pdfFile) {
      return new Response(JSON.stringify({ error: '책 제목과 PDF 파일은 필수 항목입니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. PDF File Validation (Size and Magic Bytes)
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    if (pdfFile.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: '파일 크기는 최대 100MB까지 업로드 가능합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const pdfBuffer = await pdfFile.arrayBuffer();
    const headerBytes = new Uint8Array(pdfBuffer.slice(0, 5));
    const headerString = String.fromCharCode(...headerBytes);
    if (!headerString.startsWith('%PDF-')) {
      return new Response(JSON.stringify({ error: '올바른 PDF 파일 형식이 아닙니다 (PDF Signature mismatch).' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Generate Safe Unique ID and R2 Keys
    const bookId = 'book-' + crypto.randomUUID();
    const pdfKey = `books/${bookId}/document.pdf`;
    const coverKey = `covers/${bookId}/cover.jpg`;

    // 3. Save PDF to R2
    await env.R2_BUCKET.put(pdfKey, pdfBuffer, {
      httpMetadata: {
        contentType: 'application/pdf',
      },
      customMetadata: {
        originalName: pdfFile.name,
        uploadedBy: auth.user?.email || 'admin',
      },
    });

    // 4. Save Cover to R2 if provided
    if (coverFile && coverFile.size > 0) {
      const coverBuffer = await coverFile.arrayBuffer();
      await env.R2_BUCKET.put(coverKey, coverBuffer, {
        httpMetadata: {
          contentType: coverFile.type || 'image/jpeg',
        },
      });
    }

    // 5. Insert Metadata into D1
    const statement = env.DB.prepare(
      `INSERT INTO books (id, title, description, category, pdf_key, cover_key, file_size, page_count, is_published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      bookId,
      title.trim(),
      description.trim(),
      category.trim(),
      pdfKey,
      coverKey,
      pdfFile.size,
      pageCount,
      isPublished
    );

    await statement.run();

    return new Response(
      JSON.stringify({
        success: true,
        book: {
          id: bookId,
          title,
          description,
          category,
          pdf_key: pdfKey,
          cover_key: coverKey,
          file_size: pdfFile.size,
          page_count: pageCount,
          is_published: isPublished,
        },
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: '도서 등록 실패: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
