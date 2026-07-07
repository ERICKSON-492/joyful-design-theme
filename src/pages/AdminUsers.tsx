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
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      if (error) {
        setLoadError(
          error.message.toLowerCase().includes('column') || error.code === '42703'
            ? 'This page needs the latest profiles migration (supabase/migrations/20260707160000_add_email_to_profiles.sql) applied to your live Supabase project.'
            : error.message
        )
        setLoading(false)
        return
      }
      if (data) setProfiles(data as Profile[])

      // Best-effort order counts per user — if this fails for any reason,
      // we still show the customer list without it.
      const { data: orders } = await supabase.from('orders').select('user_id')
      if (orders) {
        const counts: Record<string, number> = {}
        orders.forEach(o => {
          if (o.user_id) counts[o.user_id] = (counts[o.user_id] || 0) + 1
        })
        setOrderCounts(counts)
      }
      setLoading(false)
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
    <div>
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
        </div>
      )}

      <div className="relative max-w-sm mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, email, or phone..."
          className="w-full border border-border bg-background rounded-lg pl-9 pr-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
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
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Orders</th>
                <th className="px-4 py-2 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                  <td className="px-4 py-2 font-medium text-foreground whitespace-nowrap">{p.display_name || '—'}</td>
                  <td className="px-4 py-2 text-foreground">
                    {p.email ? (
                      <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 hover:text-primary">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> {p.email}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2 text-foreground whitespace-nowrap">
                    {p.phone ? (
                      <a href={`tel:${p.phone}`} className="flex items-center gap-1.5 hover:text-primary">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> {p.phone}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2 text-foreground">{orderCounts[p.user_id] || 0}</td>
                  <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                    {new Date(p.created_at).toLocaleDateString()}
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
