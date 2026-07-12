// Ushanga Chronicles — bot pre-rendering Worker (Testing Configuration)
//
// Standalone Direct Link Test Mode:
// Bypasses UA/Hostname restrictions so you can view the output directly 
// inside your standard browser by navigating to your .workers.dev link.

interface Env {
  BROWSER: Fetcher & {
    quickAction: (
      action: string,
      options: Record<string, unknown>
    ) => Promise<Response>
  }
}

// How long a rendered snapshot is considered fresh before Browser Run is
// asked to render that URL again.
const CACHE_TTL_SECONDS = 60 * 60 * 6 // 6 hours

// Only these hostnames can be rendered through this Worker in production.
const ALLOWED_HOSTNAMES = new Set([
  'ushangachronicles.com',
  'www.ushangachronicles.com',
])

// Known search engine, social-preview, and AI crawlers.
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

    // -------------------------------------------------------------------------
    // 🛠️ TESTING OVERRIDE: Commented out to allow your browser to see the worker output
    // -------------------------------------------------------------------------
    /*
    if (!isBotRequest(request) || !isPageRequest(request) || !ALLOWED_HOSTNAMES.has(url.hostname)) {
      return fetch(request)
    }
    */

    // Force the worker to fetch and render your actual site for testing
    // rather than looking up the 'joyful-design-theme' workers.dev domain.
    const testTargetUrl = new URL("https://ushangachronicles.com")

    // Serve a cached snapshot if we rendered this exact URL recently.
    const cache = caches.default
    const cacheKey = new Request(url.toString(), request)
    const cached = await cache.match(cacheKey)
    if (cached) {
      return cached
    }

    try {
      // Execute headless rendering via Cloudflare Browser Run
      const html = await renderWithBrowserRun(env, testTargetUrl)
      
      const rendered = new Response(html, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': `public, max-age=${CACHE_TTL_SECONDS}`,
          'x-prerendered-by': 'browser-run-testing',
        },
      })
      
      // Cache in the background so this response isn't delayed
      ctx.waitUntil(cache.put(cacheKey, rendered.clone()))
      return rendered
    } catch (err: any) {
      console.error('Prerender failed:', err)
      // Return the error stack directly to your browser page during testing
      return new Response(`Prerender Pipeline Error: ${err.message}`, { status: 500 })
    }
  },
} satisfies ExportedHandler<Env>
