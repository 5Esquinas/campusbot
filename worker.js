/**
 * Cloudflare Worker — Proxy CORS para Campus Bot UNMA
 * Deployment: workers.cloudflare.com (gratis)
 */

const ALLOWED_ORIGINS = [
  'https://tegralan.github.io',   // cambiá por tu usuario de GitHub
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

const ALLOWED_HOSTS = [
  'campus.unma.net.ar',
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    // OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(new Response(null, { status: 204 }), origin);
    }

    // Leer la URL destino del header x-target-url
    const targetUrl = request.headers.get('x-target-url');
    if (!targetUrl) {
      return corsResponse(new Response('Missing x-target-url header', { status: 400 }), origin);
    }

    // Validar que sea del campus
    let url;
    try { url = new URL(targetUrl); } catch {
      return corsResponse(new Response('Invalid URL', { status: 400 }), origin);
    }
    if (!ALLOWED_HOSTS.includes(url.hostname)) {
      return corsResponse(new Response('Host not allowed', { status: 403 }), origin);
    }

    // Reenviar la request al campus
    const headers = new Headers(request.headers);
    headers.delete('x-target-url');
    headers.delete('origin');
    headers.delete('host');

    // Pasar cookies de sesión si vienen
    const cookie = request.headers.get('x-campus-cookie');
    if (cookie) headers.set('Cookie', cookie);

    try {
      const response = await fetch(targetUrl, {
        method:  request.method,
        headers: headers,
        body:    request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'follow',
      });

      const respHeaders = new Headers(response.headers);
      // Exponer Set-Cookie para que el cliente pueda leerlo
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) respHeaders.set('x-set-cookie', setCookie);

      const newResp = new Response(response.body, {
        status:  response.status,
        headers: respHeaders,
      });
      return corsResponse(newResp, origin);
    } catch (e) {
      return corsResponse(new Response('Proxy error: ' + e.message, { status: 502 }), origin);
    }
  }
};

function corsResponse(resp, origin) {
  const h = new Headers(resp.headers);
  h.set('Access-Control-Allow-Origin', ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  h.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type, x-target-url, x-campus-cookie');
  h.set('Access-Control-Expose-Headers', 'x-set-cookie');
  h.set('Access-Control-Allow-Credentials', 'true');
  return new Response(resp.body, { status: resp.status, headers: h });
}
