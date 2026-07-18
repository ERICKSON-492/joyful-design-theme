import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Palette, Phone, Mail, MapPin, ChevronDown, ChevronUp, Image, ExternalLink, AlertCircle } from 'lucide-react'

interface CustomOrder {
  id: string
  category: string
  vision: string | null
  colors: string[] | null
  materials: string | null
  name: string
  phone: string
  email: string | null
  delivery_location: string | null
  inspiration_image_url: string | null
  status: string
  created_at: string
}

const STATUS_OPTIONS = ['new', 'contacted', 'quoted', 'in_progress', 'completed', 'cancelled']

const statusColor = (s: string) => {
  switch (s) {
    case 'new': return 'bg-blue-100 text-blue-700'
    case 'contacted': return 'bg-yellow-100 text-yellow-700'
    case 'quoted': return 'bg-purple-100 text-purple-700'
    case 'in_progress': return 'bg-orange-100 text-orange-700'
    case 'completed': return 'bg-green-100 text-green-700'
    case 'cancelled': return 'bg-red-100 text-red-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

const statusLabel = (s: string) => s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())

export default function AdminCustomOrders() {
  const [orders, setOrders] = useState<CustomOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  const fetchOrders = async () => {
    setLoading(true)
    setLoadError(null)
    const { data, error } = await (supabase as any).from('custom_orders').select('*').order('created_at', { ascending: false })
    if (error) {
      setLoadError(
        error.message.toLowerCase().includes('column') || error.code === '42703'
          ? 'This page needs the latest custom_orders migration applied to your live Supabase project.'
          : error.message
      )
      setLoading(false)
      return
    }
    if (data) {
      setOrders(data as unknown as CustomOrder[])
      // Check which images are broken
      data.forEach(order => {
        if (order.inspiration_image_url) {
          checkImageUrl(order.id, order.inspiration_image_url)
        }
      })
    }
    setLoading(false)
  }

  const checkImageUrl = async (orderId: string, url: string) => {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      if (!response.ok) {
        setImageErrors(prev => ({ ...prev, [orderId]: true }))
      }
    } catch {
      setImageErrors(prev => ({ ...prev, [orderId]: true }))
    }
  }

  useEffect(() => { fetchOrders() }, [])

  const updateStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from('custom_orders').update({ status }).eq('id', id)
    if (error) { toast.error(error.message); return }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    toast.success('Status updated')
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)
  const newCount = orders.filter(o => o.status === 'new').length

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Custom Orders</h1>
        {newCount > 0 && (
          <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
            {newCount} new
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-6 max-w-2xl">
        Requests submitted through the "Create Yours" custom order form.
      </p>

      {loadError && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-4 mb-6 text-sm">
          <p className="font-semibold mb-1">Couldn't load custom orders</p>
          <p>{loadError}</p>
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-full font-medium ${filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >
          All ({orders.length})
        </button>
        {STATUS_OPTIONS.map(s => {
          const count = orders.filter(o => o.status === s).length
          if (count === 0 && filter !== s) return null
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium ${filter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              {statusLabel(s)} ({count})
            </button>
          )
        })}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : loadError ? null : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Palette className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No custom order requests {filter !== 'all' ? `with status "${statusLabel(filter)}"` : 'yet'}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const isExpanded = expandedId === order.id
            const hasImageError = imageErrors[order.id]
            
            return (
              <div key={order.id} className="bg-card border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap ${statusColor(order.status)}`}>
                      {statusLabel(order.status)}
                    </span>
                    <span className="font-semibold text-foreground truncate">{order.name}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">{order.category}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap hidden md:inline">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                    {order.inspiration_image_url && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <Image className="w-3 h-3" />
                        {hasImageError ? '⚠️' : '✓'}
                      </span>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-4 py-4 space-y-4 bg-accent/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 text-sm">
                        <p className="flex items-center gap-2 text-foreground">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <a href={`tel:${order.phone}`} className="hover:text-primary">{order.phone}</a>
                        </p>
                        {order.email && (
                          <p className="flex items-center gap-2 text-foreground">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <a href={`mailto:${order.email}`} className="hover:text-primary">{order.email}</a>
                          </p>
                        )}
                        {order.delivery_location && (
                          <p className="flex items-center gap-2 text-foreground">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            {order.delivery_location}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Submitted {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="space-y-2 text-sm">
                        <p><span className="text-muted-foreground">Category:</span> <span className="text-foreground font-medium">{order.category}</span></p>
                        {order.colors && order.colors.length > 0 && (
                          <p><span className="text-muted-foreground">Colors:</span> <span className="text-foreground">{order.colors.join(', ')}</span></p>
                        )}
                        {order.materials && (
                          <p><span className="text-muted-foreground">Materials:</span> <span className="text-foreground">{order.materials}</span></p>
                        )}
                      </div>
                    </div>

                    {order.vision && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Their vision</p>
                        <p className="text-sm text-foreground bg-card border border-border rounded-lg p-3">{order.vision}</p>
                      </div>
                    )}

                    {order.inspiration_image_url ? (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-muted-foreground">Inspiration photo</p>
                          <div className="flex gap-2">
                            <a 
                              href={order.inspiration_image_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              Open <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                        {hasImageError ? (
                          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4 text-sm">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                              <div>
                                <p className="text-yellow-700 dark:text-yellow-300 font-medium">Image URL exists but cannot be loaded</p>
                                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 break-all">
                                  URL: {order.inspiration_image_url}
                                </p>
                                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                  Make sure the storage bucket is public and the file exists.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img 
                            src={order.inspiration_image_url} 
                            alt="Inspiration" 
                            className="max-w-xs max-h-64 rounded-lg border border-border object-contain bg-muted/30"
                            onError={() => setImageErrors(prev => ({ ...prev, [order.id]: true }))}
                          />
                        )}
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Show URL
                          </summary>
                          <p className="text-xs font-mono break-all text-muted-foreground mt-1 p-2 bg-muted/30 rounded">
                            {order.inspiration_image_url}
                          </p>
                        </details>
                      </div>
                    ) : (
                      <div className="bg-muted/30 rounded-lg p-4 text-center border border-dashed border-border">
                        <Image className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">No inspiration photo uploaded</p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Status</p>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map(s => (
                          <Button
                            key={s}
                            size="sm"
                            variant={order.status === s ? 'default' : 'outline'}
                            onClick={() => updateStatus(order.id, s)}
                          >
                            {statusLabel(s)}
                          </Button>
                        ))}
                      </div>
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
