import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { format } from 'date-fns'
import { Eye, ChevronDown, ChevronUp, Search, Mail } from 'lucide-react'
import { toast } from 'sonner'
import type { Tables } from '@/integrations/supabase/types'

type Order = Tables<'orders'>

const STATUS_OPTIONS = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'failed'] as const

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-gray-100 text-gray-500',
  failed: 'bg-red-100 text-red-800',
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [])

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdating(id)
    const order = orders.find(o => o.id === id)
    await supabase.from('orders').update({ status: newStatus }).eq('id', id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
    setUpdating(null)

    // Send email notification if the order has a user_id (registered user)
    if (order?.user_id) {
      try {
        // Look up user email from profiles or use shipping address email
        const shippingAddr = order.shipping_address as Record<string, any> | null
        const customerEmail = shippingAddr?.email
        if (customerEmail) {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'order-status-update',
              recipientEmail: customerEmail,
              idempotencyKey: `order-status-${id}-${newStatus}`,
              templateData: {
                customerName: order.customer_name || 'Customer',
                orderId: id,
                status: newStatus,
                trackingNumber: order.tracking_number || '',
                totalAmount: Number(order.total_amount).toLocaleString(),
              },
            },
          })
          toast.success('Status updated & email notification sent')
        } else {
          toast.success('Status updated (no email on file)')
        }
      } catch {
        toast.success('Status updated (email notification failed)')
      }
    } else {
      toast.success('Order status updated')
    }
  }

  const filtered = orders.filter(o => {
    const matchesSearch = !search || 
      (o.customer_name?.toLowerCase().includes(search.toLowerCase())) ||
      o.phone.includes(search) ||
      o.id.includes(search)
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const parseItems = (items: unknown): Array<{ name?: string; quantity?: number; price?: number }> => {
    if (Array.isArray(items)) return items as Array<{ name?: string; quantity?: number; price?: number }>
    return []
  }

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Loading orders...</p></div>

  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">Order Management</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, phone, or order ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', count: orders.length },
          { label: 'Pending', count: orders.filter(o => o.status === 'pending').length },
          { label: 'Paid', count: orders.filter(o => o.status === 'paid').length },
          { label: 'Revenue', count: `KSh ${orders.filter(o => o.status === 'paid' || o.status === 'delivered').reduce((sum, o) => sum + Number(o.total_amount), 0).toLocaleString()}` },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-foreground">{stat.count}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const isExpanded = expandedId === order.id
            const items = parseItems(order.items)
            return (
              <div key={order.id} className="bg-card border border-border rounded-lg overflow-hidden">
                {/* Order row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground text-sm truncate">
                        {order.customer_name || 'Unknown'}
                      </p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[order.status] || 'bg-muted text-muted-foreground'}`}>
                        {order.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.phone} · {format(new Date(order.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                  <p className="font-bold text-foreground text-sm whitespace-nowrap">
                    KSh {Number(order.total_amount).toLocaleString()}
                  </p>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-border px-4 py-4 space-y-4 bg-accent/10">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Order ID</p>
                        <p className="text-foreground font-mono text-xs break-all">{order.id}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">M-Pesa Receipt</p>
                        <p className="text-foreground text-xs">{order.mpesa_receipt_number || '—'}</p>
                      </div>
                    </div>

                    {/* Items */}
                    {items.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Items</p>
                        <div className="space-y-1">
                          {items.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-foreground">{item.name || 'Item'} × {item.quantity || 1}</span>
                              <span className="text-muted-foreground">KSh {(item.price || 0).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Update status */}
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-muted-foreground">Update Status:</label>
                      <select
                        value={order.status}
                        disabled={updating === order.id}
                        onChange={e => updateStatus(order.id, e.target.value)}
                        className="px-3 py-1.5 rounded-md border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                      {updating === order.id && <span className="text-xs text-muted-foreground">Saving...</span>}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
