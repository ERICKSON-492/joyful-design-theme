/**
 * Drop-in replacement for the old hosted-backend client.
 *
 * It exposes the same call shapes the app already uses (`from(...).select()`,
 * `storage.from(...).upload()`, `functions.invoke()`, `channel()`, `auth`) but
 * every request goes to our own API server, which talks to Neon.
 */
import { apiUrl } from './apiBase'
import { getCurrentUser, logout } from './auth'

type Result<T = any> = { data: T; error: { message: string; code?: string } | null; count?: number | null }

const request = async (path: string, init: RequestInit = {}): Promise<Result<any[]>> => {
  try {
    const res = await fetch(apiUrl(path), { credentials: 'include', ...init })
    const text = await res.text()
    const parsed = text ? JSON.parse(text) : null
    if (!res.ok) return { data: [], error: { message: parsed?.message || parsed?.error || res.statusText, code: parsed?.code } }
    return { data: Array.isArray(parsed) ? parsed : parsed ? [parsed] : [], error: null }
  } catch (e: any) {
    return { data: [], error: { message: e?.message || 'Network request failed' } }
  }
}

const encodeValue = (value: unknown) => {
  if (Array.isArray(value)) return `(${value.map(v => String(v)).join(',')})`
  return String(value)
}

class Query implements PromiseLike<Result<any>> {
  private filters: string[] = []
  private columns = '*'
  private orders: string[] = []
  private limitValue: number | null = null
  private mode: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private payload: unknown = null
  private singleRow = false
  private maybe = false
  private headOnly = false

  constructor(private table: string) {}

  select(columns = '*', opts?: { count?: string; head?: boolean }) {
    this.columns = columns || '*'
    if (opts?.head) this.headOnly = true
    return this
  }
  insert(rows: unknown) { this.mode = 'insert'; this.payload = rows; return this }
  upsert(rows: unknown) { this.mode = 'insert'; this.payload = rows; return this }
  update(values: unknown) { this.mode = 'update'; this.payload = values; return this }
  delete() { this.mode = 'delete'; return this }

  eq(col: string, value: unknown) { this.filters.push(`${col}=eq.${encodeURIComponent(String(value))}`); return this }
  neq(col: string, value: unknown) { this.filters.push(`${col}=neq.${encodeURIComponent(String(value))}`); return this }
  gt(col: string, value: unknown) { this.filters.push(`${col}=gt.${encodeURIComponent(String(value))}`); return this }
  gte(col: string, value: unknown) { this.filters.push(`${col}=gte.${encodeURIComponent(String(value))}`); return this }
  lt(col: string, value: unknown) { this.filters.push(`${col}=lt.${encodeURIComponent(String(value))}`); return this }
  lte(col: string, value: unknown) { this.filters.push(`${col}=lte.${encodeURIComponent(String(value))}`); return this }
  like(col: string, value: string) { this.filters.push(`${col}=like.${encodeURIComponent(value)}`); return this }
  ilike(col: string, value: string) { this.filters.push(`${col}=ilike.${encodeURIComponent(value)}`); return this }
  is(col: string, value: unknown) { this.filters.push(`${col}=is.${value === null ? 'null' : String(value)}`); return this }
  in(col: string, values: unknown[]) { this.filters.push(`${col}=in.${encodeURIComponent(encodeValue(values))}`); return this }
  contains(col: string, values: unknown) { this.filters.push(`${col}=cs.${encodeURIComponent(Array.isArray(values) ? `{${values.join(',')}}` : String(values))}`); return this }
  match(pairs: Record<string, unknown>) { Object.entries(pairs).forEach(([k, v]) => this.eq(k, v)); return this }
  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orders.push(`${col}.${opts?.ascending === false ? 'desc' : 'asc'}${opts?.nullsFirst === false ? '.nullslast' : ''}`)
    return this
  }
  limit(count: number) { this.limitValue = count; return this }
  range(from: number, to: number) { this.limitValue = to - from + 1; return this }
  maybeSingle() { this.singleRow = true; this.maybe = true; return this }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  single(): any { this.singleRow = true; return this }

  private queryString() {
    const parts = [...this.filters]
    if (this.mode === 'select') {
      if (this.columns && this.columns !== '*') parts.push(`select=${encodeURIComponent(this.columns)}`)
      if (this.orders.length) parts.push(`order=${this.orders.join(',')}`)
      if (this.limitValue != null) parts.push(`limit=${this.limitValue}`)
    }
    return parts.length ? `?${parts.join('&')}` : ''
  }

  private async run(): Promise<Result<any>> {
    const path = `/api/db/${this.table}${this.queryString()}`
    const jsonHeaders = { 'content-type': 'application/json' }
    let result: Result<any[]>
    if (this.mode === 'select') result = await request(path)
    else if (this.mode === 'insert') result = await request(path, { method: 'POST', headers: jsonHeaders, body: JSON.stringify(this.payload) })
    else if (this.mode === 'update') result = await request(path, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify(this.payload) })
    else result = await request(path, { method: 'DELETE' })

    if (result.error) return { data: this.singleRow ? null : [], error: result.error, count: null }
    const rows = result.data || []
    if (this.headOnly) return { data: null, error: null, count: rows.length }
    if (this.singleRow) {
      if (!rows.length && !this.maybe) return { data: null, error: { message: 'No rows found', code: 'PGRST116' } }
      return { data: rows[0] ?? null, error: null }
    }
    return { data: rows, error: null, count: rows.length }
  }

  then<TResult1 = Result<any>, TResult2 = never>(
    onfulfilled?: ((value: Result<any>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.run().then(onfulfilled as never, onrejected as never)
  }
}

// ------------------------------------------------------------------- storage
const bucketApi = (bucket: string) => ({
  async upload(path: string, file: Blob | File, opts?: { contentType?: string }) {
    const res = await fetch(apiUrl(`/api/files/${bucket}/${path}`), {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': opts?.contentType || (file as File).type || 'application/octet-stream' },
      body: file,
    })
    if (!res.ok) return { data: null, error: { message: (await res.json().catch(() => ({}))).error || 'Upload failed' } }
    return { data: { path }, error: null }
  },
  getPublicUrl(path: string) {
    return { data: { publicUrl: apiUrl(`/api/files/${bucket}/${path}`) } }
  },
  async createSignedUrl(path: string, expiresIn: number) {
    const res = await fetch(apiUrl(`/api/storage/sign?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}&expires_in=${expiresIn}`), { credentials: 'include' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { data: null, error: { message: data.error || 'Could not create link' } }
    return { data: { signedUrl: apiUrl(data.path) }, error: null }
  },
  async remove(paths: string[]) {
    await Promise.all(paths.map(p => fetch(apiUrl(`/api/files/${bucket}/${p}`), { method: 'DELETE', credentials: 'include' })))
    return { data: null, error: null }
  },
})

// ------------------------------------------------------------------ channels
type Handler = (message: any) => void
type PgWatch = { event: string; table: string; filter?: string; cb: Handler; seen: Map<string, string>; primed: boolean }

/**
 * Stands in for the old realtime channels. Broadcast messages (typing
 * indicators) go through the server's channel endpoint; table subscriptions are
 * emulated by polling the rows the caller asked about and reporting what
 * changed.
 */
class Channel {
  private handlers: { event: string; cb: Handler }[] = []
  private watches: PgWatch[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private cursor = 0
  constructor(private name: string) {}

  on(type: string, filter: any, cb?: Handler) {
    if (type === 'postgres_changes' && filter && typeof filter === 'object' && cb) {
      this.watches.push({ event: String(filter.event || '*').toUpperCase(), table: String(filter.table), filter: filter.filter, cb, seen: new Map(), primed: false })
      return this
    }
    const handler = (typeof filter === 'function' ? filter : cb) as Handler
    const event = typeof filter === 'function' ? '*' : filter?.event || '*'
    if (handler) this.handlers.push({ event, cb: handler })
    return this
  }

  private async pollBroadcast() {
    const res = await fetch(apiUrl(`/api/realtime/${encodeURIComponent(this.name)}?since=${this.cursor}`), { credentials: 'include' })
    if (!res.ok) return
    const data = await res.json().catch(() => null)
    if (!data) return
    this.cursor = data.cursor ?? this.cursor
    for (const evt of data.events || []) {
      for (const h of this.handlers) if (h.event === '*' || h.event === evt.event) h.cb(evt)
    }
  }

  private async pollWatch(w: PgWatch) {
    const parts = [w.filter, 'limit=200'].filter(Boolean)
    const res = await request(`/api/db/${w.table}?${parts.join('&')}`)
    if (res.error) return
    const rows = res.data || []
    const next = new Map<string, string>()
    for (const row of rows) {
      const id = String((row as any).id ?? '')
      const snapshot = JSON.stringify(row)
      next.set(id, snapshot)
      if (!w.primed) continue
      const before = w.seen.get(id)
      if (before === undefined) { if (w.event === 'INSERT' || w.event === '*') w.cb({ eventType: 'INSERT', new: row, old: {} }) }
      else if (before !== snapshot) { if (w.event === 'UPDATE' || w.event === '*') w.cb({ eventType: 'UPDATE', new: row, old: JSON.parse(before) }) }
    }
    if (w.primed && (w.event === 'DELETE' || w.event === '*')) {
      for (const [id, snapshot] of w.seen) if (!next.has(id)) w.cb({ eventType: 'DELETE', new: {}, old: JSON.parse(snapshot) })
    }
    w.seen = next
    w.primed = true
  }

  subscribe(cb?: (status: string) => void) {
    const tick = async () => {
      if (this.handlers.length) await this.pollBroadcast().catch(() => undefined)
      for (const w of this.watches) await this.pollWatch(w).catch(() => undefined)
    }
    void tick()
    this.timer = setInterval(tick, 3000)
    cb?.('SUBSCRIBED')
    return this
  }

  async send(message: { type?: string; event?: string; payload?: unknown }) {
    await fetch(apiUrl(`/api/realtime/${encodeURIComponent(this.name)}`), {
      method: 'POST', credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event: message.event || 'message', payload: message.payload ?? {} }),
    })
    return 'ok'
  }
  unsubscribe() { if (this.timer) clearInterval(this.timer); this.timer = null; return Promise.resolve('ok') }
}

// --------------------------------------------------------------------- auth
const sessionShape = (user: Awaited<ReturnType<typeof getCurrentUser>>['user']) =>
  user ? { user: { id: user.id, email: user.email, user_metadata: { full_name: user.displayName } }, access_token: 'cookie' } : null

export const supabase = {
  from: (table: string) => new Query(table),
  rpc: async (name: string, params?: Record<string, unknown>) => {
    const res = await request(`/api/rpc/${name}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(params || {}) })
    return { data: res.data, error: res.error }
  },
  storage: { from: bucketApi },
  functions: {
    invoke: async (name: string, options?: { body?: unknown }) => {
      const res = await fetch(apiUrl(`/api/functions/${name}`), {
        method: 'POST', credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(options?.body ?? {}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return { data: null, error: { message: data.error || 'Request failed' } }
      return { data, error: null }
    },
  },
  channel: (name: string) => new Channel(name),
  removeChannel: (channel: { unsubscribe: () => Promise<unknown> } | null) => channel?.unsubscribe(),
  auth: {
    getSession: async () => {
      const { user } = await getCurrentUser().catch(() => ({ user: null }))
      return { data: { session: sessionShape(user) }, error: null }
    },
    getUser: async () => {
      const { user } = await getCurrentUser().catch(() => ({ user: null }))
      return { data: { user: sessionShape(user)?.user ?? null }, error: null }
    },
    signOut: async () => { await logout().catch(() => null); return { error: null } },
    onAuthStateChange: (_cb: unknown) => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    setSession: async (_session?: unknown) => ({ data: { session: null }, error: null }),
    updateUser: async (_attrs?: unknown) => ({ data: { user: null }, error: { message: 'Password changes happen on the account page.' } }),
    signInWithOAuth: async () => ({ data: null, error: { message: 'Google sign-in is not available yet. Use email and password.' } }),
  },
}

export default supabase
