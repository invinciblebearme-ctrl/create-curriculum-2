import { Env } from '../../types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { params, env } = context;
    const bookId = params.id as string;

    if (!bookId) {
      return new Response(JSON.stringify({ error: '도서 ID가 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'D1 데이터베이스가 바인딩되지 않았습니다.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const statement = env.DB.prepare(
      'SELECT id, title, description, category, pdf_key, cover_key, file_size, page_count, is_published, created_at, updated_at FROM books WHERE id = ?'
    ).bind(bookId);

    const book = await statement.first();

    if (!book) {
      return new Response(JSON.stringify({ error: '요청한 도서를 찾을 수 없습니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(book), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=120',
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: '도서 정보 조회 실패: ' + (error.message || 'Unknown error') }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
