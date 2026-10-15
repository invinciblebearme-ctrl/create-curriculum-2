export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. /curriculum2 접속 시 끝에 슬래시(/) 자동 리다이렉트
    if (url.pathname === '/curriculum2') {
      return Response.redirect(`${url.origin}/curriculum2/`, 301);
    }

    // 2. 2번 서재(create-curriculum-2.invinciblebearme.workers.dev)로 전달
    const targetUrl = new URL(request.url);
    targetUrl.hostname = 'create-curriculum-2.invinciblebearme.workers.dev';

    let subPath = url.pathname.replace(/^\/curriculum2\/?/, '/');
    if (!subPath.startsWith('/')) {
      subPath = '/' + subPath;
    }
    targetUrl.pathname = subPath;

    const modifiedRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow',
    });

    const response = await fetch(modifiedRequest);

    // 3. 2번 서재 에셋 경로(/curriculum2/) 보장
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      let html = await response.text();
      if (!html.includes('<base href=')) {
        html = html.replace('<head>', '<head><base href="/curriculum2/">');
      }
      return new Response(html, {
        status: response.status,
        headers: response.headers,
      });
    }

    return response;
  }
};