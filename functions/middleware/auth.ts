import { Env, AuthUser } from '../types';

export async function verifyAdminAuth(
  request: Request,
  env: Env
): Promise<{ success: boolean; user?: AuthUser; error?: string; status?: number }> {
  const configuredAdminEmail = (env.ADMIN_EMAIL || 'admin@school.ed.kr').trim().toLowerCase();
  const configuredAdminPassword = (env.ADMIN_PASSWORD || '7703').trim();

  // 1. Admin Password Verification (Direct header/query/bearer auth)
  const passwordHeader = request.headers.get('x-admin-password') || '';
  const url = new URL(request.url);
  const passwordQuery = url.searchParams.get('admin_password') || '';
  const authHeader = request.headers.get('Authorization') || '';
  const bearerPassword = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (
    (passwordHeader && passwordHeader === configuredAdminPassword) ||
    (passwordQuery && passwordQuery === configuredAdminPassword) ||
    (bearerPassword && bearerPassword === configuredAdminPassword)
  ) {
    return {
      success: true,
      user: {
        email: configuredAdminEmail,
        sub: 'admin-password-auth',
      },
    };
  }

  // Support local development / simulated admin mode
  const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  const devAdminHeader = request.headers.get('x-dev-admin');

  if (isLocalhost && devAdminHeader === 'true') {
    return {
      success: true,
      user: {
        email: configuredAdminEmail,
        sub: 'local-dev-admin',
      },
    };
  }

  // 2. Cloudflare Access JWT Header Check
  const accessJwt = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!accessJwt) {
    return {
      success: false,
      error: '인증 헤더(Cf-Access-Jwt-Assertion) 또는 관리자 비밀번호가 누락되었습니다.',
      status: 401,
    };
  }

  try {
    // Decode JWT parts
    const parts = accessJwt.split('.');
    if (parts.length !== 3) {
      return { success: false, error: '유효하지 않은 JWT 형식입니다.', status: 401 };
    }

    const payloadRaw = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadRaw);

    // 2. Check Expiration
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowInSeconds) {
      return { success: false, error: '인증 토큰이 만료되었습니다.', status: 401 };
    }

    // 3. Check AUD if configured
    if (env.CF_ACCESS_AUD && payload.aud) {
      const audList = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
      if (!audList.includes(env.CF_ACCESS_AUD)) {
        return { success: false, error: 'Audience 불일치 (접근 권한 없음)', status: 403 };
      }
    }

    // 4. Verify Admin Email
    const userEmail = (payload.email || '').trim().toLowerCase();
    if (!userEmail) {
      return { success: false, error: '토큰에 사용자 이메일 정보가 없습니다.', status: 401 };
    }

    if (configuredAdminEmail && userEmail !== configuredAdminEmail) {
      return {
        success: false,
        error: `접근 권한이 없습니다. (인가되지 않은 이메일: ${userEmail})`,
        status: 403,
      };
    }

    return {
      success: true,
      user: {
        email: userEmail,
        sub: payload.sub,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'JWT 디코딩 또는 검증 중 오류가 발생했습니다: ' + (err.message || 'Unknown error'),
      status: 401,
    };
  }
}
