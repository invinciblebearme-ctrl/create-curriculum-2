import { Env } from '../../types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const search = url.searchParams.get('q')?.trim() || '';
    const category = url.searchParams.get('category')?.trim() || '';
    const sort = url.searchParams.get('sort') || 'latest';

    // Fallback if D1 is not bound (e.g. initial dev or missing binding)
    if (!env.DB) {
      return new Response(
        JSON.stringify({
          error: 'D1 데이터베이스 바인딩(DB)이 설정되지 않았습니다.',
          books: [],
          total: 0,
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    let query = 'SELECT id, title, description, category, pdf_key, cover_key, file_size, page_count, is_published, created_at, updated_at FROM books WHERE is_published = 1';
    const params: any[] = [];

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
    } else {
      query += ' ORDER BY created_at DESC';
    }

    const statement = env.DB.prepare(query).bind(...params);
    const { results } = await statement.all();

    return new Response(
      JSON.stringify({
        books: results || [],
        total: results?.length || 0,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: '도서 목록 조회 중 오류가 발생했습니다: ' + (error.message || 'Server Error'),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
