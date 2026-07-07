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

  const getCustomerEmail = (order: Order) => {
    if (!order.shipping_address || typeof order.shipping_address !== 'object' || Array.isArray(order.shipping_address)) {
      return null
    }
    const email = (order.shipping_address as Record<string, unknown>).email
    return typeof email === 'string' && email.trim() ? email.trim() : null
  }

  const getShippingAddress = (order: Order) => {
    if (!order.shipping_address || typeof order.shipping_address !== 'object' || Array.isArray(order.shipping_address)) {
      return null
    }
    return order.shipping_address as Record<string, unknown>
  }

  const generateStatusEmailHtml = (order: Order, newStatus: string) => {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; padding: 14px 0; border-bottom: 3px solid #D4A017; margin-bottom: 18px;">
          <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 800; color: #1A1A1A; letter-spacing: 0.04em;">USHANGA CHRONICLES</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 2px; letter-spacing: 0.08em; text-transform: uppercase;">One bead. A thousand stories.</div>
        </div>
        
        <h2 style="color: #1A1A1A; margin: 0 0 16px 0;">Hello ${order.customer_name || 'Customer'},</h2>
        
        <p style="color: #374151; font-size: 15px; line-height: 1.5;">Your order <strong>#${order.id.slice(0, 8)}</strong> has been updated!</p>
        
        <div style="margin: 24px 0; background-color: #fafafa; border-radius: 8px; padding: 20px; text-align: center;">
          <p style="font-size: 28px; font-weight: 700; margin: 0; color: #D4A017;">
            ${newStatus.toUpperCase()}
          </p>
        </div>
        
        ${newStatus === 'shipped' && order.tracking_number ? `
          <div style="margin: 16px 0; padding: 12px; background-color: #f0f9ff; border-radius: 8px;">
            <p style="margin: 0;"><strong>Tracking Number:</strong> ${order.tracking_number}</p>
          </div>
        ` : ''}
        
        <div style="margin: 16px 0; padding: 12px; background-color: #f9f9f9; border-radius: 8px;">
          <p style="margin: 0;"><strong>Order Total:</strong> KSh ${Number(order.total_amount).toLocaleString()}</p>
        </div>
        
        <p style="color: #374151; font-size: 14px;">Thank you for shopping with Ushanga Chronicles!</p>
        
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af;">
          <p style="margin: 0;">Questions? Reply to this email or WhatsApp +254 748 207 000</p>
          <p style="margin: 8px 0 0 0;">
            <a href="https://ushangachronicles.com/privacy-policy" style="color: #9ca3af;">Privacy Policy</a>
          </p>
        </div>
      </div>
    `;
  };

  const updateStatus = async (id: string, newStatus: string) => {
  const order = orders.find(o => o.id === id)
  if (!order || order.status === newStatus) return

  setUpdating(id)

  try {
    // First, update the order status in database
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', id)

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError
    }

    // Update local state immediately
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))

    // Get customer email for notification
    const customerEmail = getCustomerEmail(order)
    
    if (!customerEmail) {
      toast.success('Status updated (no email on file)')
      return
    }

    // Try to send email notification (don't block status update if email fails)
    try {
      const { error: emailError } = await supabase.functions.invoke('send-emails', {
        body: {
          to: customerEmail,
          subject: `Order #${id.slice(0, 8)} Status Update - Ushanga Chronicles`,
          html: generateStatusEmailHtml(order, newStatus)
        }
      })

      if (emailError) {
        console.error('Email error:', emailError);
        toast.warning('Status updated, but email notification failed')
      } else {
        toast.success('Status updated & email sent!')
      }
    } catch (emailErr) {
      console.error('Email sending failed:', emailErr);
      toast.warning('Status updated, but email notification failed')
    }
    
  } catch (error) {
    console.error('Order status update failed:', error)
    toast.error('Failed to update order status')
  } finally {
    setUpdating(null)
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
                        <p className="text-foreground text-xs">{order.mpesa_receipt_number || '-'}</p>
                      </div>
                    </div>

                    {/* Delivery / pickup details */}
                    {(() => {
                      const addr = getShippingAddress(order)
                      if (!addr) return null
                      const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
                      const location = str(addr.location)
                      const method = str(addr.shipping_method)
                      const building = str(addr.building_name)
                      const floor = str(addr.floor_number)
                      const house = str(addr.house_number)
                      if (!location && !method && !building && !house) return null
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 text-sm space-y-1">
                          <p className="text-xs text-muted-foreground mb-1 font-medium">Delivery / Pickup</p>
                          {method && <p className="text-foreground text-xs"><span className="text-muted-foreground">Method:</span> {method}</p>}
                          {location && <p className="text-foreground text-xs"><span className="text-muted-foreground">Area:</span> {location}</p>}
                          {(building || floor || house) && (
                            <p className="text-foreground text-xs">
                              <span className="text-muted-foreground">Address:</span>{' '}
                              {[house, floor, building].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                      )
                    })()}

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
