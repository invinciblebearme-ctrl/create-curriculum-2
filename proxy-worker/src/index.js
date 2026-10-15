export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. /curriculum 으로 접근 시 /curriculum/ 으로 자동 리다이렉트 (Trailing slash)
    if (url.pathname === '/curriculum') {
      url.pathname = '/curriculum/';
      return Response.redirect(url.toString(), 301);
    }

    // 2. future-curriculum.pages.dev 로 프록시
    const targetUrl = new URL(request.url);
    targetUrl.hostname = 'future-curriculum.pages.dev';

    let subPath = url.pathname.replace(/^\/curriculum\/?/, '/');
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

    // 3. HTML 응답에 <base href="/curriculum/"> 주입하여 모든 JS/CSS 에셋 경로 절대 보장
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      let html = await response.text();
      if (!html.includes('<base href=')) {
        html = html.replace('<head>', '<head><base href="/curriculum/">');
      }
      return new Response(html, {
        status: response.status,
        headers: response.headers,
      });
    }

    return response;
  }
};
