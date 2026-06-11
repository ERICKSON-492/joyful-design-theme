import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Mail, Send, CheckCircle2, XCircle, Loader2, Eye, RefreshCw, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

interface LogRow {
  id: string
  template_name: string | null
  recipient_email: string
  status: string
  error_message: string | null
  created_at: string
}

interface Stats {
  total: number
  sent: number
  failed: number
  pending: number
  subscribers: number
}

export default function AdminNewsletter() {
  const [stats, setStats] = useState<Stats>({ total: 0, sent: 0, failed: 0, pending: 0, subscribers: 0 })
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)
  const [filter, setFilter] = useState<'all' | 'newsletter-digest'>('all')

  const loadData = async () => {
    setLoading(true)
    const baseQuery = filter === 'all'
      ? supabase.from('email_send_log').select('*').order('created_at', { ascending: false }).limit(100)
      : supabase.from('email_send_log').select('*').eq('template_name', filter).order('created_at', { ascending: false }).limit(100)

    const [{ data: rows }, sentRes, failedRes, pendingRes, subsRes] = await Promise.all([
      baseQuery,
      supabase.from('email_send_log').select('id', { count: 'exact', head: true }).eq('status', 'sent'),
      supabase.from('email_send_log').select('id', { count: 'exact', head: true }).in('status', ['failed', 'error', 'bounced']),
      supabase.from('email_send_log').select('id', { count: 'exact', head: true }).in('status', ['pending', 'queued']),
      supabase.from('newsletter_subscribers').select('id', { count: 'exact', head: true }),
    ])

    setLogs((rows as LogRow[]) || [])
    const sent = sentRes.count || 0
    const failed = failedRes.count || 0
    const pending = pendingRes.count || 0
    setStats({
      total: sent + failed + pending,
      sent, failed, pending,
      subscribers: subsRes.count || 0,
    })
    setLoading(false)
  }

  useEffect(() => { loadData() }, [filter])

  const runDigest = async () => {
    setRunning(true)
    setLastResult(null)
    try {
      const { data, error } = await supabase.functions.invoke('send-newsletter-digest', { body: {} })
      if (error) throw error
      setLastResult(data)
      if (data?.sent > 0) toast.success(`Digest sent to ${data.sent} subscribers`)
      else if (data?.reason === 'no_new_products' && !data?.posts) toast.info('No new content to send today')
      else toast.success('Digest job completed')
      setTimeout(loadData, 1500)
    } catch (e: any) {
      toast.error(e.message || 'Failed to run digest')
      setLastResult({ error: e.message })
    }
    setRunning(false)
  }

  const deliveryRate = stats.total > 0 ? ((stats.sent / stats.total) * 100).toFixed(1) : '0'

  return (
    <div>
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Newsletter</h1>
          <p className="text-sm text-muted-foreground mt-1">Email delivery stats and digest controls</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/newsletter/preview" className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border border-border rounded-lg hover:bg-accent transition-colors">
            <Eye className="w-4 h-4" /> Preview today's digest
          </Link>
          <button onClick={runDigest} disabled={running}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {running ? 'Sending...' : 'Send digest now'}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard icon={Users} label="Subscribers" value={stats.subscribers} color="text-blue-500" />
        <StatCard icon={Mail} label="Total sends" value={stats.total} color="text-foreground" />
        <StatCard icon={CheckCircle2} label="Delivered" value={stats.sent} color="text-green-500" />
        <StatCard icon={XCircle} label="Failed" value={stats.failed} color="text-destructive" />
        <StatCard icon={Loader2} label="Delivery rate" value={`${deliveryRate}%`} color="text-primary" />
      </div>

      {/* Last run result */}
      {lastResult && (
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-sm mb-2 text-foreground">Last run result</h3>
          <pre className="text-xs text-muted-foreground overflow-x-auto bg-muted/40 p-3 rounded">{JSON.stringify(lastResult, null, 2)}</pre>
        </div>
      )}

      {/* Logs table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground">Recent deliveries</h2>
            <button onClick={loadData} className="p-1.5 hover:bg-accent rounded-md transition-colors" title="Refresh">
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value as any)}
            className="text-sm border border-border rounded-md px-3 py-1.5 bg-background">
            <option value="all">All templates</option>
            <option value="newsletter-digest">Newsletter digest only</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">When</th>
                <th className="text-left px-4 py-3 font-semibold">Recipient</th>
                <th className="text-left px-4 py-3 font-semibold">Template</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Error</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No delivery logs yet</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="border-t border-border">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-foreground">{log.recipient_email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{log.template_name || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-destructive max-w-xs truncate" title={log.error_message || ''}>{log.error_message || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Open & click tracking is not enabled (requires Resend webhook setup). Currently showing delivery status from the send queue worker.
      </p>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <Icon className={`w-5 h-5 mb-3 ${color}`} />
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase()
  const map: Record<string, string> = {
    sent: 'bg-green-500/10 text-green-600 border-green-500/30',
    delivered: 'bg-green-500/10 text-green-600 border-green-500/30',
    failed: 'bg-destructive/10 text-destructive border-destructive/30',
    error: 'bg-destructive/10 text-destructive border-destructive/30',
    bounced: 'bg-destructive/10 text-destructive border-destructive/30',
    pending: 'bg-muted text-muted-foreground border-border',
    queued: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  }
  const cls = map[s] || 'bg-muted text-muted-foreground border-border'
  return <span className={`inline-block text-xs font-medium px-2 py-1 rounded border ${cls}`}>{status || 'unknown'}</span>
}