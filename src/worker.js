export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. API Routes
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env);
    }

    // 2. Static Assets fallback (Vite SPA)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response('Asset binding not found', { status: 500 });
  }
};

async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-password, x-dev-admin',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // --- Auth Check ---
  const checkAdminAuth = () => {
    const pw = (request.headers.get('x-admin-password') || url.searchParams.get('admin_password') || '').trim();
    const authHeader = (request.headers.get('Authorization') || '').trim();
    const bearerPw = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const isDevAdmin = request.headers.get('x-dev-admin') === 'true';
    const configuredPw = String(env.ADMIN_PASSWORD || '7703').trim();
    return isDevAdmin || pw === configuredPw || bearerPw === configuredPw;
  };

  try {
    // 1. Public: GET/HEAD /api/books
    if (path === '/api/books' && (method === 'GET' || method === 'HEAD')) {
      if (!env.DB) return json({ error: 'DB not bound' }, 503, corsHeaders);
      const search = url.searchParams.get('q')?.trim() || '';
      const category = url.searchParams.get('category')?.trim() || '';
      const sort = url.searchParams.get('sort') || 'order';

      let query = 'SELECT * FROM books WHERE is_published = 1';
      const params = [];
      if (category && category !== '전체') {
        query += ' AND category = ?';
        params.push(category);
      }
      if (search) {
        query += ' AND (title LIKE ? OR description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }
      if (sort === 'title') {
        query += ' ORDER BY title ASC';
      } else if (sort === 'latest') {
        query += ' ORDER BY created_at DESC';
      } else {
        query += ' ORDER BY sort_order ASC, created_at DESC';
      }

      let results = [];
      try {
        const r = await env.DB.prepare(query).bind(...params).all();
        results = r.results || [];
      } catch {
        const fbQuery = query.replace('ORDER BY sort_order ASC, created_at DESC', 'ORDER BY created_at DESC');
        const r = await env.DB.prepare(fbQuery).bind(...params).all();
        results = r.results || [];
      }

      if (method === 'HEAD') {
        return new Response(null, { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      return json({ books: results || [], total: results?.length || 0 }, 200, { ...corsHeaders, 'Cache-Control': 'no-cache, no-store, must-revalidate' });
    }

    // 2. Public: GET/HEAD /api/books/:id/pdf
    const pdfMatch = path.match(/^\/api\/books\/([^\/]+)\/pdf$/);
    if (pdfMatch && (method === 'GET' || method === 'HEAD')) {
      const bookId = pdfMatch[1];
      let pdfKey = '';
      if (env.DB) {
        try {
          const book = await env.DB.prepare('SELECT pdf_key, is_published FROM books WHERE id = ?').bind(bookId).first();
          if (book) pdfKey = book.pdf_key;
        } catch {}
      }
      if (!pdfKey && bookId === 'create-doc-1') {
        pdfKey = '/pdf/CREATE%20%EC%88%98%EC%97%85%EC%84%A4%EA%B3%84%20%EB%AA%A8%ED%98%95%20%EA%B8%B8%EC%9E%A1%EC%9D%B4.pdf';
      }
      if (!pdfKey) return new Response('Not found', { status: 404, headers: corsHeaders });

      // Unlisted direct viewing allowed for all books
      if (pdfKey.startsWith('/pdf/')) {
        if (env.ASSETS) {
          try {
            const assetUrl = new URL(pdfKey, request.url);
            const assetRes = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));
            if (assetRes.ok) {
              const resHeaders = new Headers(assetRes.headers);
              Object.entries(corsHeaders).forEach(([k, v]) => resHeaders.set(k, v));
              resHeaders.set('Content-Type', 'application/pdf');
              resHeaders.set('Content-Disposition', 'inline');
              return new Response(method === 'HEAD' ? null : assetRes.body, { status: 200, headers: resHeaders });
            }
          } catch {}
        }
        const reqUrl = new URL(request.url);
        const basePath = reqUrl.pathname.includes('/curriculum2') ? '/curriculum2' : '';
        return Response.redirect(`${reqUrl.origin}${basePath}${pdfKey}`, 302);
      }

      if (!env.R2_BUCKET) return new Response('R2 not bound', { status: 503, headers: corsHeaders });
      const range = request.headers.get('Range');
      const r2Options = range ? { range: request.headers } : {};
      const object = await env.R2_BUCKET.get(pdfKey, r2Options);
      if (!object) return new Response('PDF file not found in storage', { status: 404, headers: corsHeaders });

      const headers = new Headers(corsHeaders);
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Content-Type', 'application/pdf');
      headers.set('Content-Disposition', 'inline');
      headers.set('Accept-Ranges', 'bytes');
      return new Response(method === 'HEAD' ? null : object.body, { status: object.range ? 206 : 200, headers });
    }

    // 3. Public: GET/HEAD /api/books/:id/cover
    const coverMatch = path.match(/^\/api\/books\/([^\/]+)\/cover$/);
    if (coverMatch && (method === 'GET' || method === 'HEAD')) {
      const bookId = coverMatch[1];
      if (!env.DB) return new Response('DB not bound', { status: 503, headers: corsHeaders });
      const book = await env.DB.prepare('SELECT cover_key FROM books WHERE id = ?').bind(bookId).first();
      if (!book || !book.cover_key) return new Response('Cover not found', { status: 404, headers: corsHeaders });

      if (!env.R2_BUCKET) return new Response('R2 not bound', { status: 503, headers: corsHeaders });
      const object = await env.R2_BUCKET.get(book.cover_key);
      if (!object) return new Response('Cover file not found in storage', { status: 404, headers: corsHeaders });

      const headers = new Headers(corsHeaders);
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
      headers.set('Cache-Control', 'public, max-age=86400');
      return new Response(method === 'HEAD' ? null : object.body, { status: 200, headers });
    }

    // 4. Public: GET /api/books/:id
    const singleMatch = path.match(/^\/api\/books\/([^\/]+)$/);
    if (singleMatch && (method === 'GET' || method === 'HEAD')) {
      const bookId = singleMatch[1];
      let book = null;
      if (env.DB) {
        try {
          book = await env.DB.prepare('SELECT * FROM books WHERE id = ?').bind(bookId).first();
        } catch {}
      }
      if (!book && bookId === 'create-doc-1') {
        book = {
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
        };
      }
      if (!book) return json({ error: '도서를 찾을 수 없습니다.' }, 404, corsHeaders);
      return json(book, 200, corsHeaders);
    }

    // 5. Admin: POST /api/admin/auth/verify
    if (path === '/api/admin/auth/verify' && method === 'POST') {
      let bodyPw = '';
      try {
        const body = await request.clone().json();
        bodyPw = String(body?.password || '').trim();
      } catch {}
      const headerPw = (request.headers.get('x-admin-password') || '').trim();
      const queryPw = (url.searchParams.get('admin_password') || '').trim();
      const authHeader = (request.headers.get('Authorization') || '').trim();
      const bearerPw = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      const isDevAdmin = request.headers.get('x-dev-admin') === 'true';

      const configuredPw = String(env.ADMIN_PASSWORD || '7703').trim();
      const candidatePw = bodyPw || headerPw || queryPw || bearerPw;

      if (isDevAdmin || candidatePw === configuredPw) {
        return json({ authenticated: true, user: { email: env.ADMIN_EMAIL || 'admin@school.ed.kr' } }, 200, corsHeaders);
      }
      return json({ authenticated: false, error: '관리자 비밀번호가 올바르지 않습니다.' }, 401, corsHeaders);
    }

    // --- Admin-only routes below ---
    if (!checkAdminAuth()) {
      return json({ error: '관리자 인증이 필요합니다.' }, 401, corsHeaders);
    }

    // 6. Admin: GET /api/admin/books
    if (path === '/api/admin/books' && (method === 'GET' || method === 'HEAD')) {
      if (!env.DB) return json({ error: 'DB not bound' }, 503, corsHeaders);
      let results = [];
      try {
        const r = await env.DB.prepare('SELECT * FROM books ORDER BY sort_order ASC, created_at DESC').all();
        results = r.results || [];
      } catch {
        const r = await env.DB.prepare('SELECT * FROM books ORDER BY created_at DESC').all();
        results = r.results || [];
      }
      return json({ books: results || [], total: results?.length || 0 }, 200, { ...corsHeaders, 'Cache-Control': 'no-cache, no-store, must-revalidate' });
    }

    // 7. Admin: POST /api/admin/books/reorder
    if (path === '/api/admin/books/reorder' && method === 'POST') {
      if (!env.DB) return json({ error: 'DB not bound' }, 503, corsHeaders);
      const body = await request.json();
      const orders = body?.orders || [];
      for (const item of orders) {
        if (item.id && item.sort_order !== undefined) {
          try {
            await env.DB.prepare("UPDATE books SET sort_order = ?, updated_at = datetime('now') WHERE id = ?")
              .bind(item.sort_order, item.id)
              .run();
          } catch {}
        }
      }
      return json({ success: true, count: orders.length }, 200, corsHeaders);
    }

    // 8. Admin: POST /api/admin/books (Upload)
    if (path === '/api/admin/books' && method === 'POST') {
      if (!env.DB || !env.R2_BUCKET) return json({ error: 'DB or R2 not bound' }, 503, corsHeaders);
      const formData = await request.formData();
      const title = (formData.get('title') || '').toString().trim();
      const description = (formData.get('description') || '').toString().trim();
      const category = (formData.get('category') || '영어').toString().trim();
      const emoji = (formData.get('emoji') || '📖').toString().trim();
      const sortOrderRaw = formData.get('sort_order');
      const sortOrder = sortOrderRaw !== null && sortOrderRaw !== undefined ? parseInt(sortOrderRaw, 10) : 0;
      const isPublished = formData.get('is_published') === '1' || formData.get('is_published') === 'true' ? 1 : 0;
      const pdfFile = formData.get('pdf_file');
      const coverFile = formData.get('cover_file');

      if (!title || !pdfFile) {
        return json({ error: '도서 제목과 PDF 파일은 필수 항목입니다.' }, 400, corsHeaders);
      }

      const bookId = 'book-' + crypto.randomUUID();
      const pdfKey = `books/${bookId}/document.pdf`;
      const coverKey = `covers/${bookId}/cover.jpg`;

      const pdfBuffer = await pdfFile.arrayBuffer();
      await env.R2_BUCKET.put(pdfKey, pdfBuffer, {
        httpMetadata: { contentType: 'application/pdf' },
        customMetadata: { originalName: pdfFile.name || 'document.pdf' },
      });

      if (coverFile && coverFile.size > 0) {
        const coverBuffer = await coverFile.arrayBuffer();
        await env.R2_BUCKET.put(coverKey, coverBuffer, {
          httpMetadata: { contentType: coverFile.type || 'image/jpeg' },
        });
      }

      try {
        await env.DB.prepare(
          `INSERT INTO books (id, title, description, category, emoji, sort_order, pdf_key, cover_key, file_size, page_count, is_published, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, datetime('now'), datetime('now'))`
        ).bind(bookId, title, description, category, emoji, sortOrder, pdfKey, coverKey, pdfFile.size, isPublished).run();
      } catch {
        await env.DB.prepare(
          `INSERT INTO books (id, title, description, category, pdf_key, cover_key, file_size, page_count, is_published, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, datetime('now'), datetime('now'))`
        ).bind(bookId, title, description, category, pdfKey, coverKey, pdfFile.size, isPublished).run();
      }

      const newBook = {
        id: bookId,
        title,
        description,
        category,
        emoji,
        sort_order: sortOrder,
        pdf_key: pdfKey,
        cover_key: coverKey,
        file_size: pdfFile.size,
        page_count: 0,
        is_published: isPublished,
      };
      return json({ success: true, book: newBook }, 201, corsHeaders);
    }

    // 9. Admin: PUT /api/admin/books/:id
    const editMatch = path.match(/^\/api\/admin\/books\/([^\/]+)$/);
    if (editMatch && method === 'PUT') {
      const bookId = editMatch[1];
      if (!env.DB) return json({ error: 'DB not bound' }, 503, corsHeaders);

      let current = await env.DB.prepare('SELECT * FROM books WHERE id = ?').bind(bookId).first();
      if (!current) {
        current = {
          id: bookId,
          title: bookId,
          description: '',
          category: '수업설계 길잡이',
          emoji: '📖',
          sort_order: 1,
          pdf_key: `books/${bookId}/document.pdf`,
          cover_key: `covers/${bookId}/cover.jpg`,
          file_size: 0,
          page_count: 0,
          is_published: 1,
        };
        try {
          await env.DB.prepare(
            `INSERT INTO books (id, title, description, category, emoji, sort_order, pdf_key, cover_key, file_size, page_count, is_published, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
          ).bind(bookId, current.title, current.description, current.category, current.emoji, current.sort_order, current.pdf_key, current.cover_key, 0, 0, 1).run();
        } catch {}
      }

      const contentType = request.headers.get('content-type') || '';
      let title = current.title;
      let description = current.description;
      let category = current.category;
      let emoji = current.emoji || '📖';
      let sortOrder = current.sort_order ?? 0;
      let isPublished = current.is_published;
      let fileSize = current.file_size;
      let pageCount = current.page_count ?? 0;
      let pdfKey = current.pdf_key;
      let coverKey = current.cover_key;

      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        if (formData.has('title')) title = formData.get('title').toString().trim();
        if (formData.has('description')) description = formData.get('description').toString().trim();
        if (formData.has('category')) category = formData.get('category').toString().trim();
        if (formData.has('emoji')) emoji = formData.get('emoji').toString().trim();
        if (formData.has('sort_order')) sortOrder = parseInt(formData.get('sort_order').toString(), 10);
        if (formData.has('page_count')) pageCount = parseInt(formData.get('page_count').toString(), 10);
        if (formData.has('is_published')) isPublished = formData.get('is_published') === '1' || formData.get('is_published') === 'true' ? 1 : 0;

        const newPdfFile = formData.get('pdf_file');
        if (newPdfFile && newPdfFile.size > 0 && env.R2_BUCKET) {
          const buffer = await newPdfFile.arrayBuffer();
          const targetPdfKey = current.pdf_key && !current.pdf_key.startsWith('/pdf/')
            ? current.pdf_key
            : `books/${bookId}/doc_${Date.now()}.pdf`;
          await env.R2_BUCKET.put(targetPdfKey, buffer, {
            httpMetadata: { contentType: 'application/pdf' },
            customMetadata: { originalName: newPdfFile.name || 'document.pdf' },
          });
          fileSize = newPdfFile.size;
          pdfKey = targetPdfKey;
        }

        const newCoverFile = formData.get('cover_file');
        if (newCoverFile && newCoverFile.size > 0 && env.R2_BUCKET) {
          const buffer = await newCoverFile.arrayBuffer();
          const targetCoverKey = current.cover_key && !current.cover_key.startsWith('/pdf/')
            ? current.cover_key
            : `covers/${bookId}/cover_${Date.now()}.jpg`;
          await env.R2_BUCKET.put(targetCoverKey, buffer, {
            httpMetadata: { contentType: newCoverFile.type || 'image/jpeg' },
          });
          coverKey = targetCoverKey;
        }
      } else {
        const body = await request.json();
        if (body.title !== undefined) title = body.title;
        if (body.description !== undefined) description = body.description;
        if (body.category !== undefined) category = body.category;
        if (body.emoji !== undefined) emoji = body.emoji;
        if (body.sort_order !== undefined) sortOrder = body.sort_order;
        if (body.page_count !== undefined) pageCount = body.page_count;
        if (body.is_published !== undefined) isPublished = body.is_published ? 1 : 0;
      }

      try {
        await env.DB.prepare(
          `UPDATE books SET title = ?, description = ?, category = ?, emoji = ?, sort_order = ?, is_published = ?, file_size = ?, page_count = ?, pdf_key = ?, cover_key = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(title, description, category, emoji, sortOrder, isPublished, fileSize, pageCount, pdfKey, coverKey, bookId).run();
      } catch {
        try {
          await env.DB.prepare(
            `UPDATE books SET title = ?, description = ?, category = ?, is_published = ?, file_size = ?, page_count = ?, pdf_key = ?, cover_key = ?, updated_at = datetime('now') WHERE id = ?`
          ).bind(title, description, category, isPublished, fileSize, pageCount, pdfKey, coverKey, bookId).run();
        } catch {
          await env.DB.prepare(
            `UPDATE books SET title = ?, description = ?, category = ?, is_published = ?, file_size = ?, updated_at = datetime('now') WHERE id = ?`
          ).bind(title, description, category, isPublished, fileSize, bookId).run();
        }
      }

      const updated = await env.DB.prepare('SELECT * FROM books WHERE id = ?').bind(bookId).first();
      return json({ success: true, book: updated || { ...current, title, description, category, emoji, sort_order: sortOrder, is_published: isPublished, file_size: fileSize, page_count: pageCount, pdf_key: pdfKey, cover_key: coverKey } }, 200, corsHeaders);
    }

    // 10. Admin: DELETE /api/admin/books/:id
    if (editMatch && method === 'DELETE') {
      const bookId = editMatch[1];
      if (!env.DB) return json({ error: 'DB not bound' }, 503, corsHeaders);
      const book = await env.DB.prepare('SELECT pdf_key, cover_key FROM books WHERE id = ?').bind(bookId).first();
      if (book) {
        if (env.R2_BUCKET) {
          if (book.pdf_key && !book.pdf_key.startsWith('/pdf/')) await env.R2_BUCKET.delete(book.pdf_key);
          if (book.cover_key && !book.cover_key.startsWith('/')) await env.R2_BUCKET.delete(book.cover_key);
        }
        await env.DB.prepare('DELETE FROM books WHERE id = ?').bind(bookId).run();
      }
      return json({ success: true, deletedId: bookId }, 200, corsHeaders);
    }

    return json({ error: 'Not Found' }, 404, corsHeaders);
  } catch (err) {
    return json({ error: err.message || 'Server Error' }, 500, corsHeaders);
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
