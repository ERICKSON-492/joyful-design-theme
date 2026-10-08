import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiUrl } from '@/lib/apiBase'

interface LoginEvent {
  id: string
  event: 'login' | 'signup' | 'login_failed'
  email: string | null
  display_name: string | null
  role: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

interface ActiveSession {
  id: string
  email: string
  display_name: string | null
  role: string
  created_at: string
  last_seen_at: string
  user_agent: string | null
  ip_address: string | null
}

const EVENT_LABEL: Record<LoginEvent['event'], string> = {
  login: 'Signed in',
  signup: 'New account',
  login_failed: 'Failed attempt',
}

function deviceLabel(ua: string | null) {
  if (!ua) return 'Unknown device'
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iOS/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'Mac' : /Linux/i.test(ua) ? 'Linux' : 'Other'
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  return `${browser} on ${os}`
}

export default function AdminLogins() {
  const [events, setEvents] = useState<LoginEvent[]>([])
  const [sessions, setSessions] = useState<ActiveSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | LoginEvent['event']>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiUrl('/api/admin/logins'), { credentials: 'include' })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Could not load logins')
      setEvents(payload.events || [])
      setSessions(payload.sessions || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load logins')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return events.filter(e =>
      (filter === 'all' || e.event === filter) &&
      (!q || (e.email || '').toLowerCase().includes(q) || (e.ip_address || '').includes(q)),
    )
  }, [events, search, filter])

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Logins</h1>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mb-6 max-w-3xl">
        Every sign-in, new account and failed attempt from now on is recorded here with time, device and IP address. Showing the latest 300.
      </p>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-4 mb-6 text-sm">{error}</div>
      )}

      <h2 className="font-semibold text-foreground mb-2">Signed in now ({sessions.length})</h2>
      <div className="bg-card border border-border rounded-lg overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b border-border">
            <tr><th className="p-3">Account</th><th className="p-3">Device</th><th className="p-3">IP</th><th className="p-3">Signed in</th><th className="p-3">Last active</th></tr>
          </thead>
          <tbody>
            {sessions.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No active sessions</td></tr>}
            {sessions.map(s => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="p-3">
                  <div className="font-medium text-foreground">{s.display_name || s.email}</div>
                  <div className="text-xs text-muted-foreground">{s.email}{s.role === 'admin' ? ' · admin' : ''}</div>
                </td>
                <td className="p-3">{deviceLabel(s.user_agent)}</td>
                <td className="p-3">{s.ip_address || '-'}</td>
                <td className="p-3 whitespace-nowrap">{new Date(s.created_at).toLocaleString()}</td>
                <td className="p-3 whitespace-nowrap">{new Date(s.last_seen_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="font-semibold text-foreground mb-2">Login history</h2>
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search email or IP..."
            className="w-full border border-border bg-background rounded-lg pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as typeof filter)}
          className="border border-border bg-background rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All events</option>
          <option value="login">Sign-ins</option>
          <option value="signup">New accounts</option>
          <option value="login_failed">Failed attempts</option>
        </select>
      </div>
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b border-border">
            <tr><th className="p-3">When</th><th className="p-3">Account</th><th className="p-3">Event</th><th className="p-3">Device</th><th className="p-3">IP</th></tr>
          </thead>
          <tbody>
            {!loading && visible.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No logins recorded yet</td></tr>}
            {visible.map(e => (
              <tr key={e.id} className="border-b border-border last:border-0">
                <td className="p-3 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                <td className="p-3">
                  <div className="text-foreground">{e.email || '-'}</div>
                  {e.role === 'admin' && <div className="text-xs text-muted-foreground">admin</div>}
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${e.event === 'login_failed' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-foreground'}`}>
                    {EVENT_LABEL[e.event]}
                  </span>
                </td>
                <td className="p-3">{deviceLabel(e.user_agent)}</td>
                <td className="p-3">{e.ip_address || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
