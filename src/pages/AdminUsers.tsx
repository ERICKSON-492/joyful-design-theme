import { useCallback, useEffect, useMemo, useState } from 'react'
import { Archive, Mail, Phone, RotateCcw, Search, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { apiUrl } from '@/lib/apiBase'

interface Customer {
  user_id: string
  display_name: string | null
  email: string
  phone: string | null
  created_at: string
  is_active: boolean
  order_count: number
}

type CustomerView = 'active' | 'archived' | 'all'

async function adminApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Admin request failed')
  return payload as T
}

export default function AdminUsers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<CustomerView>('active')
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const result = await adminApi<{ customers: Customer[] }>('/api/admin/customers')
      setCustomers(result.customers || [])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load customers'
      setLoadError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadCustomers() }, [loadCustomers])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return customers.filter(customer => {
      const matchesView = view === 'all' || customer.is_active === (view === 'active')
      const matchesSearch = !q ||
        (customer.display_name || '').toLowerCase().includes(q) ||
        customer.email.toLowerCase().includes(q) ||
        (customer.phone || '').toLowerCase().includes(q)
      return matchesView && matchesSearch
    })
  }, [customers, search, view])

  const setArchived = async (customer: Customer, archived: boolean) => {
    const label = customer.display_name || customer.email
    const action = archived ? 'archive' : 'restore'
    const message = archived
      ? `Archive ${label}'s account? They will not be able to sign in. You can restore the account later; their customer and order details will be retained.`
      : `Restore ${label}'s account and allow them to sign in again?`
    if (!window.confirm(message)) return

    setBusyId(customer.user_id)
    try {
      await adminApi(`/api/admin/customers/${encodeURIComponent(customer.user_id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      })
      setCustomers(prev => prev.map(item => item.user_id === customer.user_id ? { ...item, is_active: !archived } : item))
      toast.success(archived ? 'Customer account archived' : 'Customer account restored')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update customer account')
    } finally {
      setBusyId(null)
    }
  }

  const removeCustomer = async (customer: Customer) => {
    const label = customer.display_name || customer.email
    const confirmationKey = customer.email || customer.user_id.slice(0, 8)
    if (!window.confirm(
      `Permanently remove ${label}'s account? The profile and sign-in will be removed; linked orders will be anonymized but their totals, items, and status will be retained. Email-linked contact/custom-order messages will be scrubbed. This cannot be undone.`,
    )) return
    if (window.prompt(`Type ${confirmationKey} to confirm permanent removal`) !== confirmationKey) return

    setBusyId(customer.user_id)
    try {
      await adminApi(`/api/admin/customers/${encodeURIComponent(customer.user_id)}`, { method: 'DELETE' })
      setCustomers(prev => prev.filter(item => item.user_id !== customer.user_id))
      toast.success('Customer account removed and linked personal details anonymized')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove customer account')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Customers</h1>
        <span className="text-xs text-muted-foreground">{customers.filter(customer => customer.is_active).length} active · {customers.filter(customer => !customer.is_active).length} archived</span>
      </div>
      <p className="text-xs text-muted-foreground mb-6 max-w-3xl">
        Archive is reversible and blocks sign-in. Permanent removal deletes the account/profile and anonymizes linked order and email-matched contact details; order totals and item lines remain for bookkeeping. Published review text remains with the author anonymized. Email opt-out records are retained, and uploaded media files are not automatically purged.
      </p>

      {loadError && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-4 mb-6 text-sm">
          <p className="font-semibold mb-1">Couldn’t load customers</p>
          <p>{loadError}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void loadCustomers()}>Retry</Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, or phone..."
            className="w-full border border-border bg-background rounded-lg pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={view}
          onChange={e => setView(e.target.value as CustomerView)}
          className="border border-border bg-background rounded-lg px-3 py-2 text-sm"
          aria-label="Customer account status"
        >
          <option value="active">Active customers</option>
          <option value="archived">Archived customers</option>
          <option value="all">All customers</option>
        </select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : loadError ? null : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>{search ? 'No customers match your search.' : 'No customers in this view.'}</p>
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
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(customer => (
                <tr key={customer.user_id} className="border-b border-border last:border-0 hover:bg-accent/30">
                  <td className="px-4 py-2 font-medium text-foreground whitespace-nowrap">
                    {customer.display_name || '—'}
                    {!customer.is_active && <span className="ml-2 text-[10px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground">Archived</span>}
                  </td>
                  <td className="px-4 py-2 text-foreground">
                    <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 hover:text-primary">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> {customer.email}
                    </a>
                  </td>
                  <td className="px-4 py-2 text-foreground whitespace-nowrap">
                    {customer.phone ? (
                      <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 hover:text-primary">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> {customer.phone}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2 text-foreground">{customer.order_count}</td>
                  <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{new Date(customer.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === customer.user_id}
                        onClick={() => void setArchived(customer, customer.is_active)}
                        className="gap-1"
                      >
                        {customer.is_active ? <Archive className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                        {customer.is_active ? 'Archive' : 'Restore'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={busyId === customer.user_id}
                        onClick={() => void removeCustomer(customer)}
                        className="gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </Button>
                    </div>
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
