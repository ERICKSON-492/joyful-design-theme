import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/integrations/supabase/client'
import { Package, MessageSquare, Users, TrendingUp, ShoppingBag, ChevronRight } from 'lucide-react'

const MotionLink = motion(Link)

export default function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, enquiries: 0, unread: 0, subscribers: 0, orders: 0 })

  useEffect(() => {
    const fetchStats = async () => {
      const [products, enquiries, unread, subs, orders] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('enquiry_messages').select('id', { count: 'exact', head: true }),
        supabase.from('enquiry_messages').select('id', { count: 'exact', head: true }).eq('is_read', false).eq('is_from_admin', false),
        supabase.from('newsletter_subscribers').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
      ])
      setStats({
        products: products.count || 0,
        enquiries: enquiries.count || 0,
        unread: unread.count || 0,
        subscribers: subs.count || 0,
        orders: orders.count || 0,
      })
    }
    fetchStats()
  }, [])

  const cards = [
    { label: 'Total Products', value: stats.products, icon: Package, color: 'text-primary', href: '/admin/products' },
    { label: 'Orders', value: stats.orders, icon: ShoppingBag, color: 'text-orange-500', href: '/admin/orders' },
    { label: 'Enquiries', value: stats.enquiries, icon: MessageSquare, color: 'text-blue-500', href: '/admin/enquiries' },
    { label: 'Unread Messages', value: stats.unread, icon: TrendingUp, color: 'text-destructive', href: '/admin/enquiries' },
    { label: 'Subscribers', value: stats.subscribers, icon: Users, color: 'text-green-500', href: '/admin/newsletter' },
  ]

  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-8">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(card => (
          <MotionLink
            key={card.label}
            to={card.href}
            className="group bg-card border border-border p-5 rounded-lg cursor-pointer transition-colors hover:border-primary/50 hover:shadow-md"
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="flex items-center justify-between mb-3">
              <card.icon className={`w-5 h-5 ${card.color}`} />
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" />
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
          </MotionLink>
        ))}
      </div>
    </div>
  )
}
