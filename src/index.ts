// Ushanga Chronicles — bot pre-rendering Worker
//
// Sits in front of the site as a Worker Route. For real visitors, every
// request passes straight through to Cloudflare Pages, completely
// unchanged — this Worker never affects what a human sees.
//
// For known search/social/AI crawler user-agents, it instead:
//   1. Checks the Cache API for a recently-rendered snapshot of that exact
//      URL and serves it if still fresh (avoids paying for a Browser Run
//      render on every single crawl).
//   2. If nothing cached (or it's stale), asks Browser Run to load the real
//      page in headless Chrome, wait for it to finish rendering, and
//      returns that fully-rendered HTML — so crawlers see actual headings,
//      nav, prices, and products instead of an empty <div id="root">.
//   3. Caches the result for CACHE_TTL_SECONDS before rendering again.
//
// Deployment/config notes are in cloudflare/prerender-worker/README.md.

interface Env {
  BROWSER: Fetcher & {
    quickAction: (
      action: string,
      options: Record<string, unknown>
    ) => Promise<Response>
  }
}

// How long a rendered snapshot is considered fresh before Browser Run is
// asked to render that URL again. Raise this if your content changes
// rarely; lower it if you publish new products/pages very frequently.
const CACHE_TTL_SECONDS = 60 * 60 * 6 // 6 hours

// Only these hostnames can be rendered through this Worker — prevents it
// from becoming an open rendering proxy for arbitrary sites.
const ALLOWED_HOSTNAMES = new Set([
  'ushangachronicles.com',
  'www.ushangachronicles.com',
])

// Known search engine, social-preview, and AI crawlers. Anything not
// matching this list is treated as a normal visitor and passed straight
// through untouched — this list only ever *adds* prerendering, it never
// blocks or restricts anyone.
const BOT_USER_AGENT_PATTERN = new RegExp(
  [
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider', 'yandexbot',
    'facebookexternalhit', 'twitterbot', 'linkedinbot', 'whatsapp', 'telegrambot',
    'discordbot', 'skypeuripreview', 'applebot', 'ia_archiver', 'slackbot',
    'semrushbot', 'ahrefsbot', 'mj12bot', 'dotbot', 'petalbot',
    'gptbot', 'chatgpt-user', 'oai-searchbot', 'perplexitybot', 'claudebot',
    'google-extended', 'bytespider', 'pinterest', 'redditbot',
    'bot', 'crawl', 'spider', 'slurp', 'preview',
  ].join('|'),
  'i'
)

function isBotRequest(request: Request): boolean {
  const ua = request.headers.get('user-agent') || ''
  return BOT_USER_AGENT_PATTERN.test(ua)
}

function isPageRequest(request: Request): boolean {
  // Only intercept actual page navigations — never static assets (JS, CSS,
  // images, fonts, etc.), which browsers/crawlers request without this
  // Accept header, and which should always come straight from Pages.
  const accept = request.headers.get('accept') || ''
  return accept.includes('text/html')
}

async function renderWithBrowserRun(env: Env, targetUrl: URL): Promise<string> {
  const response = await env.BROWSER.quickAction('content', {
    url: targetUrl.toString(),
    gotoOptions: {
      waitUntil: 'networkidle2',
      timeout: 30000,
    },
  })

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500)
    throw new Error(`Browser Run failed with ${response.status}: ${detail}`)
  }

  const data = (await response.json()) as { success: boolean; result?: string }
  if (!data.success || typeof data.result !== 'string') {
    throw new Error('Browser Run returned an unsuccessful response')
  }
  return data.result
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    // Never touch anything other than a real page request from a known bot.
    if (!isBotRequest(request) || !isPageRequest(request) || !ALLOWED_HOSTNAMES.has(url.hostname)) {
      return fetch(request)
    }

    // Serve a cached snapshot if we rendered this exact URL recently.
    const cache = caches.default
    const cacheKey = new Request(url.toString(), request)
    const cached = await cache.match(cacheKey)
    if (cached) {
      return cached
    }

    try {
      const html = await renderWithBrowserRun(env, url)
      const rendered = new Response(html, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': `public, max-age=${CACHE_TTL_SECONDS}`,
          'x-prerendered-by': 'browser-run',
        },
      })
      // Cache in the background so this response isn't delayed by it.
      ctx.waitUntil(cache.put(cacheKey, rendered.clone()))
      return rendered
    } catch (err) {
      // If rendering fails for any reason, fall back to the normal SPA
      // response rather than showing the crawler an error page — worst
      // case it just sees the same empty shell as before, not worse.
      console.error('Prerender failed, falling back to origin:', err)
      return fetch(request)
    }
  },
} satisfies ExportedHandler<Env>
