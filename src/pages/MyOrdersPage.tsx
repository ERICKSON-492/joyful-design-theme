import { useState, useEffect } from 'react'
import { useSEO } from '@/hooks/useSEO'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Package, Truck, CheckCircle, Clock, MapPin, ArrowLeft, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface Order {
  id: string
  created_at: string
  status: string
  total_amount: number
  customer_name: string | null
  phone: string
  items: any
  tracking_number: string | null
  shipping_address: any
}

const statusSteps = ['pending', 'confirmed', 'shipped', 'delivered']
const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="w-5 h-5" />,
  confirmed: <Package className="w-5 h-5" />,
  shipped: <Truck className="w-5 h-5" />,
  delivered: <CheckCircle className="w-5 h-5" />,
}
const statusLabels: Record<string, string> = {
  pending: 'Order Placed',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
}

export default function MyOrdersPage() {
  useSEO('My Orders', undefined, undefined, true)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/auth')
        return
      }
      setUser(session.user)

      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      setOrders(data || [])
      setLoading(false)
    }
    init()
  }, [navigate])

  if (loading) {
    return (
      <div className="bg-background min-h-screen pt-24 pb-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="bg-background min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">My Orders</h1>
        <p className="text-muted-foreground mb-8">Track your purchases and delivery status</p>

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">No orders yet</h2>
            <p className="text-muted-foreground mb-6">Start shopping to see your orders here</p>
            <Link to="/shop" className="inline-block bg-primary text-primary-foreground px-8 py-3 font-bold text-sm tracking-wider uppercase">
              Shop Now
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order, i) => {
              const currentStep = statusSteps.indexOf(order.status)
              const items = Array.isArray(order.items) ? order.items : []

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-card border border-border rounded-lg overflow-hidden"
                >
                  {/* Order Header */}
                  <div className="p-5 border-b border-border">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Order #{order.id.slice(0, 8).toUpperCase()} • {new Date(order.created_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="font-bold text-lg text-primary mt-1">KSh {Number(order.total_amount).toLocaleString()}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                        order.status === 'confirmed' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {statusIcons[order.status] || statusIcons.pending}
                        {statusLabels[order.status] || order.status}
                      </span>
                    </div>
                  </div>

                  {/* Status Timeline */}
                  <div className="px-5 py-4">
                    <div className="flex items-center justify-between mb-4">
                      {statusSteps.map((step, idx) => (
                        <div key={step} className="flex items-center flex-1">
                          <div className={`flex flex-col items-center ${idx <= currentStep ? 'text-primary' : 'text-muted-foreground/40'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              idx <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            }`}>
                              {idx < currentStep ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                            </div>
                            <span className="text-[10px] mt-1 font-medium hidden sm:block">{statusLabels[step]}</span>
                          </div>
                          {idx < statusSteps.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-1 ${idx < currentStep ? 'bg-primary' : 'bg-muted'}`} />
                          )}
                        </div>
                      ))}
                    </div>

                    {order.tracking_number && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2 mb-3">
                        <Truck className="w-4 h-4" />
                        Tracking: <span className="font-mono font-semibold text-foreground">{order.tracking_number}</span>
                      </div>
                    )}

                    {order.shipping_address && Object.keys(order.shipping_address).length > 0 && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                          {[order.shipping_address.address, order.shipping_address.city, order.shipping_address.postal_code].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Items */}
                  <div className="px-5 pb-5">
                    <div className="border-t border-border pt-3 space-y-2">
                      {items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-foreground">{item.name} <span className="text-muted-foreground">× {item.quantity}</span></span>
                          <span className="font-medium text-foreground">KSh {(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
