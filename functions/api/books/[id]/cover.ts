import { Env } from '../../../types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { params, env } = context;
    const bookId = params.id as string;

    if (!bookId || !env.DB || !env.R2_BUCKET) {
      return new Response('필수 파라미터 또는 R2 바인딩 누락', { status: 400 });
    }

    const book = await env.DB.prepare(
      'SELECT cover_key FROM books WHERE id = ?'
    ).bind(bookId).first<{ cover_key: string }>();

    if (!book || !book.cover_key) {
      return new Response('표지 정보를 찾을 수 없습니다.', { status: 404 });
    }

    const object = await env.R2_BUCKET.get(book.cover_key);

    if (!object) {
      return new Response('표지 이미지를 찾을 수 없습니다.', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=86400'); // 1 day cache

    return new Response(object.body, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    return new Response('표지 로딩 실패: ' + (error.message || 'Error'), {
      status: 500,
    });
  }
};
