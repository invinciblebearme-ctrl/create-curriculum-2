import { Env } from '../../../types';
import { verifyAdminAuth } from '../../../middleware/auth';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const auth = await verifyAdminAuth(request, env);

  if (!auth.success) {
    return new Response(
      JSON.stringify({
        authenticated: false,
        error: auth.error,
      }),
      {
        status: auth.status || 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache',
        },
      }
    );
  }

  return new Response(
    JSON.stringify({
      authenticated: true,
      user: auth.user,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache',
      },
    }
  );
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  let bodyPassword = '';
  try {
    const body = await request.clone().json() as any;
    bodyPassword = body?.password || '';
  } catch {}

  const configuredAdminPassword = (env.ADMIN_PASSWORD || '7703').trim();
  if (bodyPassword && bodyPassword.trim() === configuredAdminPassword) {
    return new Response(
      JSON.stringify({
        authenticated: true,
        user: {
          email: env.ADMIN_EMAIL || 'admin@school.ed.kr',
          sub: 'admin-password-auth',
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache',
        },
      }
    );
  }

  // Fallback to standard auth check
  const auth = await verifyAdminAuth(request, env);
  if (!auth.success) {
    return new Response(
      JSON.stringify({
        authenticated: false,
        error: auth.error || '비밀번호가 올바르지 않습니다.',
      }),
      {
        status: auth.status || 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache',
        },
      }
    );
  }

  return new Response(
    JSON.stringify({
      authenticated: true,
      user: auth.user,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache',
      },
    }
  );
};
