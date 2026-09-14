export async function onRequest(context) {
  const { request, env } = context;

  if (!env.API_ORIGIN) {
    return new Response(JSON.stringify({ error: 'API_ORIGIN is not configured' }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

  const incoming = new URL(request.url);
  const upstream = new URL(env.API_ORIGIN);
  upstream.pathname = incoming.pathname;
  upstream.search = incoming.search;

  const headers = new Headers(request.headers);
  headers.delete('host');

  const upstreamRequest = new Request(upstream, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'follow',
  });

  const response = await fetch(upstreamRequest);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
