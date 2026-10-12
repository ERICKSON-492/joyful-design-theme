import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/dbClient'
import { apiUrl } from '@/lib/apiBase'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown, ShoppingBag, Users, Wallet, Eye, Globe2, AlertTriangle, Trophy, Filter, Smartphone } from 'lucide-react'

interface OrderRow {
  id: string
  created_at: string
  status: string
  total_amount: number
  items: { id: string; name: string; price: number; quantity: number }[] | null
}
interface ProductRow { id: string; name: string; category: string | null; stock: number; low_stock_threshold: number | null; is_active: boolean }
interface Row { name: string; visitors: number }
interface VisitorReport {
  summary: { visitors: number; today: number; this_week: number; page_views: number; avg_engagement_seconds: number; engaged_sessions: number }
  daily: { day: string; visitors: number }[]
  countries: Row[]
  regions: Row[]
  pages: { path: string; page_views: number; unique_visitors: number }[]
  sources: Row[]
  devices?: Row[]
  funnel?: { visited: number; viewed_product: number; reached_checkout: number }
}

// Only these statuses count as real sales.
const REVENUE_STATUSES = ['confirmed', 'paid', 'processing', 'shipped', 'delivered']
const RANGES = [7, 30, 90]
const DAY = 86400000
const CHART_TOOLTIP = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 13 }

const ksh = (n: number) => `KSh ${Math.round(n).toLocaleString()}`
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0)

function countryName(value: string) {
  if (!/^[A-Za-z]{2}$/.test(value)) return value
  try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(value.toUpperCase()) || value } catch { return value }
}
function duration(seconds: number) {
  if (!seconds || seconds < 1) return '0s'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m ? `${m}m ${s}s` : `${s}s`
}
function pageName(path: string) {
  if (path === '/') return 'Home page'
  if (path.startsWith('/shop')) return 'Shop'
  if (path.startsWith('/product')) return `Product: ${decodeURIComponent(path.split('/')[2] || '').replace(/-/g, ' ')}`
  if (path.startsWith('/checkout')) return 'Checkout'
  if (path.startsWith('/chronicle')) return 'The Chronicle'
  const clean = path.replace(/^\//, '').replace(/[-/]/g, ' ')
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

function Change({ now, before }: { now: number; before: number }) {
  if (!before && !now) return <span className="text-xs text-muted-foreground">No sales yet</span>
  if (!before) return <span className="text-xs text-muted-foreground">New this period</span>
  const diff = Math.round(((now - before) / before) * 100)
  const up = diff >= 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${up ? 'text-primary' : 'text-destructive'}`}>
      <Icon className="w-3 h-3" /> {up ? '+' : ''}{diff}% vs previous {''}
    </span>
  )
}

function Stat({ icon: Icon, label, value, hint, children }: { icon: typeof Eye; label: string; value: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-2">
        <Icon className="w-4 h-4 text-primary" /> {label}
      </div>
      <p className="font-display text-2xl md:text-3xl font-bold text-foreground">{value}</p>
      <div className="mt-1 min-h-[1rem]">{children ?? (hint && <span className="text-xs text-muted-foreground">{hint}</span>)}</div>
    </div>
  )
}

function Section({ title, subtitle, icon: Icon, children }: { title: string; subtitle?: string; icon: typeof Eye; children: ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-xl p-5 md:p-6">
      <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2"><Icon className="w-5 h-5 text-primary" />{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </section>
  )
}

function BarList({ rows, total, empty }: { rows: { label: string; value: number; extra?: string }[]; total: number; empty: string }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground py-6 text-center">{empty}</p>
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={`${r.label}-${i}`} className="text-sm">
          <div className="flex justify-between gap-4">
            <span className="truncate text-foreground capitalize">{r.label}</span>
            <span className="whitespace-nowrap font-semibold text-foreground">{r.extra ?? r.value.toLocaleString()} <span className="font-normal text-muted-foreground">{pct(r.value, total)}%</span></span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, pct(r.value, total))}%` }} /></div>
        </div>
      ))}
    </div>
  )
}

export default function AdminAnalytics() {
  const [days, setDays] = useState(30)
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])
  const [customers, setCustomers] = useState<number | null>(null)
  const [visitors, setVisitors] = useState<VisitorReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      const [o, p, c, v] = await Promise.all([
        supabase.from('orders').select('id, created_at, status, total_amount, items').order('created_at', { ascending: true }),
        supabase.from('products').select('id, name, category, stock, low_stock_threshold, is_active'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        fetch(apiUrl(`/api/admin/analytics/visitors?days=${days}`), { credentials: 'include' })
          .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Visitor numbers could not be loaded'); return j as VisitorReport })
          .catch(e => (e instanceof Error ? e : new Error('Visitor numbers could not be loaded'))),
      ])
      if (o.error) setError(o.error.message); else setOrders((o.data || []) as unknown as OrderRow[])
      if (p.data) setProducts(p.data as unknown as ProductRow[])
      setCustomers(c.count ?? null)
      if (v instanceof Error) setError(prev => prev || v.message); else setVisitors(v)
      setLoading(false)
    }
    load()
  }, [days])

  const stats = useMemo(() => {
    const now = Date.now()
    const start = now - days * DAY
    const prevStart = start - days * DAY
    const paid = orders.filter(o => REVENUE_STATUSES.includes(o.status))
    const current = paid.filter(o => new Date(o.created_at).getTime() >= start)
    const previous = paid.filter(o => { const t = new Date(o.created_at).getTime(); return t >= prevStart && t < start })
    const sum = (list: OrderRow[]) => list.reduce((s, o) => s + Number(o.total_amount || 0), 0)
    const allInPeriod = orders.filter(o => new Date(o.created_at).getTime() >= start)

    const byDay: Record<string, number> = {}
    for (let t = start; t <= now; t += DAY) byDay[new Date(t).toLocaleDateString('en-CA')] = 0
    current.forEach(o => { const d = new Date(o.created_at).toLocaleDateString('en-CA'); byDay[d] = (byDay[d] || 0) + Number(o.total_amount || 0) })
    const chart = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([d, revenue]) => ({ day: new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), revenue: Math.round(revenue) }))

    const categoryOf: Record<string, string> = {}
    products.forEach(p => { categoryOf[p.name] = p.category || 'Other' })
    const productMap: Record<string, { name: string; qty: number; revenue: number }> = {}
    const catMap: Record<string, number> = {}
    current.forEach(o => (o.items || []).forEach(i => {
      const name = i.name || 'Unknown'
      const line = (i.price || 0) * (i.quantity || 0)
      productMap[name] ??= { name, qty: 0, revenue: 0 }
      productMap[name].qty += i.quantity || 0
      productMap[name].revenue += line
      const cat = categoryOf[name] || 'Other'
      catMap[cat] = (catMap[cat] || 0) + line
    }))
    const lowStock = products.filter(p => p.is_active && p.stock <= (p.low_stock_threshold ?? 3)).sort((a, b) => a.stock - b.stock).slice(0, 8)

    return {
      revenue: sum(current), prevRevenue: sum(previous),
      count: current.length, prevCount: previous.length,
      avg: current.length ? sum(current) / current.length : 0,
      prevAvg: previous.length ? sum(previous) / previous.length : 0,
      pending: allInPeriod.filter(o => o.status === 'pending').length,
      chart,
      top: Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 6),
      categories: Object.entries(catMap).sort(([, a], [, b]) => b - a).map(([label, value]) => ({ label, value, extra: ksh(value) })),
      lowStock,
    }
  }, [orders, products, days])

  const funnel = visitors?.funnel
  const funnelSteps = [
    { label: 'Visited the site', value: funnel?.visited ?? visitors?.summary.visitors ?? 0 },
    { label: 'Looked at a product', value: funnel?.viewed_product ?? 0 },
    { label: 'Started checkout', value: funnel?.reached_checkout ?? 0 },
    { label: 'Paid for an order', value: stats.count },
  ]
  const totalVisitors = visitors?.summary.visitors ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">How The Ushanga Tribe shop is doing over the last {days} days.</p>
        </div>
        <div className="inline-flex rounded-full bg-muted p-1">
          {RANGES.map(d => (
            <button key={d} onClick={() => setDays(d)} className={`min-h-[36px] px-4 rounded-full text-sm font-medium transition-colors ${days === d ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {d} days
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl p-4 text-sm">
          <p className="font-semibold">Some numbers couldn't load</p><p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : (
        <>
          {/* Sales summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat icon={Wallet} label="Sales" value={ksh(stats.revenue)}><Change now={stats.revenue} before={stats.prevRevenue} /></Stat>
            <Stat icon={ShoppingBag} label="Paid orders" value={stats.count.toLocaleString()}><Change now={stats.count} before={stats.prevCount} /></Stat>
            <Stat icon={TrendingUp} label="Average order" value={ksh(stats.avg)}><Change now={stats.avg} before={stats.prevAvg} /></Stat>
            <Stat icon={Users} label="Visitors" value={totalVisitors.toLocaleString()} hint={`${visitors?.summary.today ?? 0} today · ${customers ?? 0} registered customers`} />
          </div>
          {stats.pending > 0 && (
            <p className="text-sm text-muted-foreground">{stats.pending} order{stats.pending > 1 ? 's are' : ' is'} still waiting for payment and not counted in sales.</p>
          )}

          <Section icon={Wallet} title="Sales over time" subtitle="Money from paid orders each day">
            {stats.revenue === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No paid orders in this period yet.</p> : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={stats.chart} margin={{ left: -10, right: 8 }}>
                  <defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" fontSize={11} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" minTickGap={24} />
                  <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickFormatter={v => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <Tooltip formatter={(v: number) => [ksh(v), 'Sales']} contentStyle={CHART_TOOLTIP} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#salesFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Section>

          {/* Visitors to buyers */}
          <Section icon={Filter} title="From visitor to buyer" subtitle="How many people moved to each step. A big drop shows where shoppers give up.">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {funnelSteps.map((s, i) => (
                <div key={s.label} className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground">Step {i + 1}</p>
                  <p className="font-display text-2xl font-bold text-foreground">{s.value.toLocaleString()}</p>
                  <p className="text-sm text-foreground">{s.label}</p>
                  {i > 0 && <p className="text-xs text-primary font-medium mt-1">{pct(s.value, funnelSteps[i - 1].value)}% of previous step</p>}
                </div>
              ))}
            </div>
          </Section>

          {/* Best sellers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section icon={Trophy} title="Best sellers" subtitle="Top products by money made">
              {!stats.top.length ? <p className="text-sm text-muted-foreground py-6 text-center">No products sold in this period yet.</p> : (
                <ol className="divide-y divide-border">
                  {stats.top.map((p, i) => (
                    <li key={p.name} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <span className="flex-1 truncate text-foreground">{p.name}</span>
                      <span className="text-muted-foreground whitespace-nowrap">{p.qty} sold</span>
                      <span className="font-semibold text-foreground whitespace-nowrap">{ksh(p.revenue)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Section>
            <Section icon={ShoppingBag} title="Sales by category" subtitle="Which collections bring in the most">
              <BarList rows={stats.categories} total={stats.categories.reduce((s, c) => s + c.value, 0)} empty="No category sales yet." />
            </Section>
          </div>

          <Section icon={AlertTriangle} title="Running low" subtitle="Active products at or below their low-stock level">
            {!stats.lowStock.length ? <p className="text-sm text-muted-foreground py-4 text-center">Everything is well stocked.</p> : (
              <div className="grid sm:grid-cols-2 gap-2">
                {stats.lowStock.map(p => (
                  <div key={p.id} className="flex justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                    <span className="truncate text-foreground">{p.name}</span>
                    <span className={`font-semibold whitespace-nowrap ${p.stock <= 0 ? 'text-destructive' : 'text-primary'}`}>{p.stock <= 0 ? 'Sold out' : `${p.stock} left`}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Where visitors come from */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section icon={Globe2} title="How people found you" subtitle="Instagram, Google, WhatsApp links and more">
              <BarList rows={(visitors?.sources || []).slice(0, 7).map(r => ({ label: r.name, value: r.visitors }))} total={totalVisitors} empty="No visitor data yet." />
            </Section>
            <Section icon={Globe2} title="Where visitors are" subtitle="By country">
              <BarList rows={(visitors?.countries || []).slice(0, 7).map(r => ({ label: countryName(r.name), value: r.visitors }))} total={totalVisitors} empty="No visitor data yet." />
            </Section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section icon={Eye} title="Most visited pages" subtitle="Number of different people who opened each page">
              <BarList rows={(visitors?.pages || []).slice(0, 7).map(p => ({ label: pageName(p.path), value: p.unique_visitors, extra: `${p.unique_visitors} people` }))} total={totalVisitors} empty="No page visits yet." />
            </Section>
            <Section icon={Smartphone} title="Devices" subtitle={`Visitors spend about ${duration(visitors?.summary.avg_engagement_seconds ?? 0)} on the site per visit`}>
              <BarList rows={(visitors?.devices || []).map(r => ({ label: r.name, value: r.visitors }))} total={totalVisitors} empty="Device info will appear after the next server update." />
            </Section>
          </div>
        </>
      )}
    </div>
  )
}
