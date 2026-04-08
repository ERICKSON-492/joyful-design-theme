import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Package, MessageSquare, Users, TrendingUp } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, enquiries: 0, unread: 0, subscribers: 0 })

  useEffect(() => {
    const fetchStats = async () => {
      const [products, enquiries, unread, subs] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('enquiry_messages').select('id', { count: 'exact', head: true }),
        supabase.from('enquiry_messages').select('id', { count: 'exact', head: true }).eq('is_read', false).eq('is_from_admin', false),
        supabase.from('newsletter_subscribers').select('id', { count: 'exact', head: true }),
      ])
      setStats({
        products: products.count || 0,
        enquiries: enquiries.count || 0,
        unread: unread.count || 0,
        subscribers: subs.count || 0,
      })
    }
    fetchStats()
  }, [])

  const cards = [
    { label: 'Total Products', value: stats.products, icon: Package, color: 'text-primary' },
    { label: 'Enquiries', value: stats.enquiries, icon: MessageSquare, color: 'text-blue-500' },
    { label: 'Unread Messages', value: stats.unread, icon: TrendingUp, color: 'text-destructive' },
    { label: 'Subscribers', value: stats.subscribers, icon: Users, color: 'text-green-500' },
  ]

  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-8">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className="bg-card border border-border p-5 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
