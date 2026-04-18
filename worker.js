addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  const targetUrl = request.headers.get('x-target-url')
  if (!targetUrl) {
    return new Response('Falta x-target-url', { status: 400, headers: corsHeaders() })
  }

  if (!targetUrl.includes('campus.unma.net.ar')) {
    return new Response('URL no permitida', { status: 403, headers: corsHeaders() })
  }

  const reqHeaders = new Headers()
  reqHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
  reqHeaders.set('Accept', 'text/html,application/xhtml+xml,*/*')
  reqHeaders.set('Accept-Language', 'es-AR,es;q=0.9')

  const ct = request.headers.get('Content-Type')
  if (ct) reqHeaders.set('Content-Type', ct)

  const cookie = request.headers.get('x-campus-cookie')
  if (cookie) reqHeaders.set('Cookie', cookie)

  let body = null
  if (request.method === 'POST') {
    body = await request.text()
  }

  let response
  try {
    response = await fetch(targetUrl, {
      method: request.method,
      headers: reqHeaders,
      body: body,
      redirect: 'follow'
    })
  } catch (e) {
    return new Response('Error: ' + e.message, { status: 502, headers: corsHeaders() })
  }

  const respBody = await response.text()
  const respHeaders = corsHeaders()
  respHeaders.set('Content-Type', response.headers.get('Content-Type') || 'text/html; charset=utf-8')

  const setCookie = response.headers.get('set-cookie')
  if (setCookie) {
    respHeaders.set('x-set-cookie', setCookie)
  }

  return new Response(respBody, { status: response.status, headers: respHeaders })
}

function corsHeaders() {
  return new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-target-url, x-campus-cookie',
    'Access-Control-Expose-Headers': 'x-set-cookie',
    'Access-Control-Max-Age': '86400'
  })
}
