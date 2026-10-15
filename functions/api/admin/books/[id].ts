import { Env } from '../../../types';
import { verifyAdminAuth } from '../../../middleware/auth';

// PUT: 도서 메타데이터 수정 또는 파일 교체
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, params, env } = context;
  const bookId = params.id as string;

  const auth = await verifyAdminAuth(request, env);
  if (!auth.success) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status || 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!env.DB || !env.R2_BUCKET) {
    return new Response(JSON.stringify({ error: 'DB 또는 R2 바인딩 누락' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const existing = await env.DB.prepare(
      'SELECT id, pdf_key, cover_key FROM books WHERE id = ?'
    ).bind(bookId).first<{ id: string; pdf_key: string; cover_key: string }>();

    if (!existing) {
      return new Response(JSON.stringify({ error: '수정할 도서를 찾을 수 없습니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const title = formData.get('title') as string | null;
      const description = formData.get('description') as string | null;
      const category = formData.get('category') as string | null;
      const isPublishedRaw = formData.get('is_published');
      const isPublished = isPublishedRaw !== null ? (isPublishedRaw === 'true' || isPublishedRaw === '1' ? 1 : 0) : null;
      
      const newPdfFile = formData.get('pdf_file') as File | null;
      const newCoverFile = formData.get('cover_file') as File | null;

      // Handle PDF replacement if provided
      if (newPdfFile && newPdfFile.size > 0) {
        const buffer = await newPdfFile.arrayBuffer();
        await env.R2_BUCKET.put(existing.pdf_key, buffer, {
          httpMetadata: { contentType: 'application/pdf' },
        });
      }

      // Handle Cover replacement if provided
      if (newCoverFile && newCoverFile.size > 0) {
        const buffer = await newCoverFile.arrayBuffer();
        await env.R2_BUCKET.put(existing.cover_key, buffer, {
          httpMetadata: { contentType: newCoverFile.type || 'image/jpeg' },
        });
      }

      // Update D1
      const updateFields: string[] = ["updated_at = datetime('now')"];
      const updateParams: any[] = [];

      if (title !== null) {
        updateFields.push('title = ?');
        updateParams.push(title.trim());
      }
      if (description !== null) {
        updateFields.push('description = ?');
        updateParams.push(description.trim());
      }
      if (category !== null) {
        updateFields.push('category = ?');
        updateParams.push(category.trim());
      }
      if (isPublished !== null) {
        updateFields.push('is_published = ?');
        updateParams.push(isPublished);
      }

      updateParams.push(bookId);

      await env.DB.prepare(
        `UPDATE books SET ${updateFields.join(', ')} WHERE id = ?`
      ).bind(...updateParams).run();

    } else {
      // JSON payload update (e.g. quick publish toggle or edit)
      const body = await request.json() as any;
      const updateFields: string[] = ["updated_at = datetime('now')"];
      const updateParams: any[] = [];

      if (body.title !== undefined) {
        updateFields.push('title = ?');
        updateParams.push(body.title.trim());
      }
      if (body.description !== undefined) {
        updateFields.push('description = ?');
        updateParams.push(body.description.trim());
      }
      if (body.category !== undefined) {
        updateFields.push('category = ?');
        updateParams.push(body.category.trim());
      }
      if (body.is_published !== undefined) {
        updateFields.push('is_published = ?');
        updateParams.push(body.is_published ? 1 : 0);
      }

      updateParams.push(bookId);

      await env.DB.prepare(
        `UPDATE books SET ${updateFields.join(', ')} WHERE id = ?`
      ).bind(...updateParams).run();
    }

    const updated = await env.DB.prepare(
      'SELECT id, title, description, category, pdf_key, cover_key, file_size, page_count, is_published, created_at, updated_at FROM books WHERE id = ?'
    ).bind(bookId).first();

    return new Response(JSON.stringify({ success: true, book: updated }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: '수정 실패: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE: 도서 삭제 (D1 메타데이터 및 R2 파일 삭제)
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, params, env } = context;
  const bookId = params.id as string;

  const auth = await verifyAdminAuth(request, env);
  if (!auth.success) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status || 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!env.DB || !env.R2_BUCKET) {
    return new Response(JSON.stringify({ error: 'DB 또는 R2 바인딩 누락' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const book = await env.DB.prepare(
      'SELECT pdf_key, cover_key FROM books WHERE id = ?'
    ).bind(bookId).first<{ pdf_key: string; cover_key: string }>();

    if (!book) {
      return new Response(JSON.stringify({ error: '삭제할 도서를 찾을 수 없습니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Delete R2 objects
    if (book.pdf_key) {
      await env.R2_BUCKET.delete(book.pdf_key);
    }
    if (book.cover_key) {
      await env.R2_BUCKET.delete(book.cover_key);
    }

    // 2. Delete D1 record
    await env.DB.prepare('DELETE FROM books WHERE id = ?').bind(bookId).run();

    return new Response(JSON.stringify({ success: true, deletedId: bookId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: '도서 삭제 실패: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
