import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts'
import { TrendingUp, ShoppingBag, Users, Package } from 'lucide-react'

interface OrderRow {
  id: string
  created_at: string
  status: string
  total_amount: number
  items: { id: string; name: string; price: number; quantity: number }[] | null
}

// Orders in these statuses represent a completed/real sale for revenue
// purposes. Pending/cancelled/failed orders never contributed revenue.
const REVENUE_STATUSES = ['confirmed', 'paid', 'processing', 'shipped', 'delivered']

const RANGE_OPTIONS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: 'All time', days: null },
]

const PIE_COLORS = ['#D4A017', '#2563EB', '#16A34A', '#DC2626', '#7C3AED', '#EA580C', '#6B7280']

export default function AdminAnalytics() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [customerCount, setCustomerCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [rangeDays, setRangeDays] = useState<number | null>(30)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      const { data, error } = await supabase
        .from('orders')
        .select('id, created_at, status, total_amount, items')
        .order('created_at', { ascending: true })
      if (error) {
        setLoadError(error.message)
        setLoading(false)
        return
      }
      if (data) setOrders(data as unknown as OrderRow[])

      const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
      setCustomerCount(count ?? null)
      setLoading(false)
    }
    load()
  }, [])

  const filteredOrders = useMemo(() => {
    if (rangeDays === null) return orders
    const cutoff = Date.now() - rangeDays * 24 * 60 * 60 * 1000
    return orders.filter(o => new Date(o.created_at).getTime() >= cutoff)
  }, [orders, rangeDays])

  const revenueOrders = useMemo(
    () => filteredOrders.filter(o => REVENUE_STATUSES.includes(o.status)),
    [filteredOrders]
  )

  const totalRevenue = useMemo(() => revenueOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0), [revenueOrders])
  const avgOrderValue = revenueOrders.length > 0 ? totalRevenue / revenueOrders.length : 0

  const revenueByDay = useMemo(() => {
    const map: Record<string, number> = {}
    revenueOrders.forEach(o => {
      const day = new Date(o.created_at).toLocaleDateString('en-CA') // YYYY-MM-DD, sorts naturally
      map[day] = (map[day] || 0) + Number(o.total_amount || 0)
    })
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, revenue]) => ({
        day: new Date(day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        revenue: Math.round(revenue),
      }))
  }, [revenueOrders])

  const statusBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    filteredOrders.forEach(o => { map[o.status] = (map[o.status] || 0) + 1 })
    return Object.entries(map).map(([status, count]) => ({ name: status, value: count }))
  }, [filteredOrders])

  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; revenue: number }> = {}
    revenueOrders.forEach(o => {
      (o.items || []).forEach(item => {
        const key = item.name || 'Unknown'
        if (!map[key]) map[key] = { name: key, quantity: 0, revenue: 0 }
        map[key].quantity += item.quantity || 0
        map[key].revenue += (item.price || 0) * (item.quantity || 0)
      })
    })
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 8)
  }, [revenueOrders])

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Analytics</h1>
        <div className="flex gap-2 flex-wrap">
          {RANGE_OPTIONS.map(r => (
            <button
              key={r.label}
              onClick={() => setRangeDays(r.days)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium ${rangeDays === r.days ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-4 mb-6 text-sm">
          <p className="font-semibold mb-1">Couldn't load analytics</p>
          <p>{loadError}</p>
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border border-border p-5 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">KSh {Math.round(totalRevenue).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Revenue</p>
            </div>
            <div className="bg-card border border-border p-5 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <ShoppingBag className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{revenueOrders.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Completed Orders</p>
            </div>
            <div className="bg-card border border-border p-5 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <Package className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">KSh {Math.round(avgOrderValue).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Avg Order Value</p>
            </div>
            <div className="bg-card border border-border p-5 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{customerCount ?? '—'}</p>
              <p className="text-xs text-muted-foreground mt-1">Registered Customers</p>
            </div>
          </div>

          {/* Revenue over time */}
          <div className="bg-card border border-border rounded-lg p-5 mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Revenue Over Time</h3>
            {revenueByDay.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No revenue in this period yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueByDay}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4A017" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#D4A017" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number) => [`KSh ${v.toLocaleString()}`, 'Revenue']}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 13 }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#D4A017" strokeWidth={2} fill="url(#revenueFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top products */}
            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Top Products by Revenue</h3>
              {topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No product sales in this period yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" fontSize={12} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" fontSize={11} width={110} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      formatter={(v: number, key: string) => key === 'revenue' ? [`KSh ${v.toLocaleString()}`, 'Revenue'] : [v, 'Qty sold']}
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 13 }}
                    />
                    <Bar dataKey="revenue" fill="#D4A017" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Status breakdown */}
            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Orders by Status</h3>
              {statusBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No orders in this period yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(d) => `${d.name} (${d.value})`}>
                      {statusBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 13 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
