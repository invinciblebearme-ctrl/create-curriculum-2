import { Env } from '../../../types';
import { verifyAdminAuth } from '../../../middleware/auth';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { request, params, env } = context;
    const bookId = params.id as string;

    if (!bookId) {
      return new Response('도서 ID가 누락되었습니다.', { status: 400 });
    }

    if (!env.DB || !env.R2_BUCKET) {
      return new Response('D1 또는 R2 스토리지 바인딩이 누락되었습니다.', { status: 503 });
    }

    // 1. Check book publication status in D1
    const book = await env.DB.prepare(
      'SELECT pdf_key, is_published FROM books WHERE id = ?'
    ).bind(bookId).first<{ pdf_key: string; is_published: number }>();

    if (!book) {
      return new Response('도서를 찾을 수 없습니다.', { status: 404 });
    }

    // If unpublished, require admin authentication
    if (book.is_published === 0) {
      const auth = await verifyAdminAuth(request, env);
      if (!auth.success) {
        return new Response('비공개 도서는 관리자 인증이 필요합니다.', { status: 403 });
      }
    }

    // 2. Fetch object from R2 with HTTP Range support
    const rangeHeader = request.headers.get('Range');
    const r2Options: R2GetOptions = rangeHeader ? { range: request.headers } : {};

    const object = await env.R2_BUCKET.get(book.pdf_key, r2Options);

    if (!object) {
      return new Response('PDF 파일을 스토리지에서 찾을 수 없습니다.', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', 'inline');
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=3600');

    // Partial response if range was requested
    if (object.range) {
      const status = 'offset' in object.range ? 206 : 200;
      return new Response(object.body, {
        status,
        headers,
      });
    }

    return new Response(object.body, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    return new Response('PDF 스트리밍 중 오류 발생: ' + (error.message || 'Error'), {
      status: 500,
    });
  }
};
