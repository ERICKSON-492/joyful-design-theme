import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Search, Users, Mail, Phone } from 'lucide-react'

interface Profile {
  id: string
  user_id: string
  display_name: string | null
  email: string | null
  phone: string | null
  created_at: string
}

export default function AdminUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      
      try {
        // Fetch from profiles table (not users)
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (error) {
          console.error('Supabase error:', error)
          setLoadError(
            error.message.toLowerCase().includes('permission') 
              ? 'Permission denied. Please check your Row Level Security policies.'
              : error.message
          )
          setLoading(false)
          return
        }
        
        if (data) {
          setProfiles(data as Profile[])
        }

        // Fetch order counts
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('user_id')
        
        if (ordersError) {
          console.warn('Could not fetch order counts:', ordersError)
          // Don't set error here - just continue without order counts
        }
        
        if (orders) {
          const counts: Record<string, number> = {}
          orders.forEach(o => {
            if (o.user_id) {
              counts[o.user_id] = (counts[o.user_id] || 0) + 1
            }
          })
          setOrderCounts(counts)
        }
      } catch (err: any) {
        console.error('Load error:', err)
        setLoadError(err.message || 'Failed to load customers')
      } finally {
        setLoading(false)
      }
    }
    
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return profiles
    return profiles.filter(p =>
      (p.display_name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q)
    )
  }, [profiles, search])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Customers</h1>
        <span className="text-xs text-muted-foreground">{profiles.length} registered</span>
      </div>
      <p className="text-xs text-muted-foreground mb-6 max-w-2xl">
        Everyone who's created an account on the site. This doesn't include guest checkouts —
        those are only visible in Orders.
      </p>

      {loadError && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-4 mb-6 text-sm">
          <p className="font-semibold mb-1">Couldn't load customers</p>
          <p>{loadError}</p>
          <p className="mt-2 text-xs opacity-70">
            Make sure you have proper Row Level Security policies set up for the profiles table.
          </p>
        </div>
      )}

      <div className="relative max-w-sm mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, email, or phone..."
          className="w-full border border-border bg-background rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : loadError ? null : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>{search ? 'No customers match your search.' : 'No registered customers yet.'}</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                    {p.display_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {p.email ? (
                      <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> 
                        <span className="truncate max-w-[150px]">{p.email}</span>
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-foreground whitespace-nowrap">
                    {p.phone ? (
                      <a href={`tel:${p.phone}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> 
                        {p.phone}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-foreground text-center">
                    <span className="inline-flex items-center justify-center bg-primary/10 text-primary px-3 py-0.5 rounded-full text-xs font-medium">
                      {orderCounts[p.user_id] || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                    {new Date(p.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
