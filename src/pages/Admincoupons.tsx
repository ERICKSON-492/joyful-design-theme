import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Trash2, Copy, Tag, Loader2 } from 'lucide-react'

interface Coupon {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_amount: number | null
  usage_limit: number | null
  times_used: number
  is_active: boolean
  expires_at: string | null
  created_at: string
}

const emptyForm = {
  code: '',
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: '',
  min_order_amount: '',
  usage_limit: '',
  expires_at: '',
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchCoupons = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      if (data) setCoupons(data as Coupon[])
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch coupons')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoupons()
  }, [])

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
    setForm(f => ({ ...f, code }))
  }

  const createCoupon = async () => {
    if (!form.code.trim()) { toast.error('Enter a coupon code'); return }
    if (!form.discount_value || parseFloat(form.discount_value) <= 0) { toast.error('Enter a valid discount value'); return }
    if (form.discount_type === 'percentage' && parseFloat(form.discount_value) > 100) {
      toast.error("Percentage discount can't exceed 100")
      return
    }

    setSaving(true)
    
    // Set expiry to the end of the chosen day in local time to avoid timezone cutting it short prematurely
    let expiryISO: string | null = null
    if (form.expires_at) {
      const expiryDate = new Date(form.expires_at)
      expiryDate.setHours(23, 59, 59, 999)
      expiryISO = expiryDate.toISOString()
    }

    const { data, error } = await supabase
      .from('coupons')
      .insert({
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : null,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit, 10) : null,
        expires_at: expiryISO,
      })
      .select()

    setSaving(false)

    if (error) {
      toast.error(error.code === '23505' ? 'That code already exists' : error.message)
      return
    }

    toast.success('Coupon created')
    if (data) setCoupons(prev => [data[0] as Coupon, ...prev])
    setForm(emptyForm)
    setShowForm(false)
  }

  const toggleActive = async (coupon: Coupon) => {
    const nextState = !coupon.is_active
    
    // Optimistic Update
    setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: nextState } : c))

    const { error } = await supabase
      .from('coupons')
      .update({ is_active: nextState })
      .eq('id', coupon.id)

    if (error) {
      toast.error(error.message)
      // Rollback on error
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: coupon.is_active } : c))
    }
  }

  const deleteCoupon = async (id: string) => {
    if (!confirm('Delete this coupon? This cannot be undone.')) return
    
    const originalCoupons = [...coupons]
    // Optimistic Update
    setCoupons(prev => prev.filter(c => c.id !== id))

    const { error } = await supabase.from('coupons').delete().eq('id', id)
    
    if (error) {
      toast.error(error.message)
      // Rollback on error
      setCoupons(originalCoupons)
      return
    }
    
    toast.success('Coupon deleted')
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Copied to clipboard')
  }

  const isExpired = (c: Coupon) => c.expires_at && new Date(c.expires_at) < new Date()
  const isMaxedOut = (c: Coupon) => c.usage_limit !== null && c.times_used >= c.usage_limit

  const statusOf = (c: Coupon) => {
    if (!c.is_active) return { label: 'Disabled', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' }
    if (isExpired(c)) return { label: 'Expired', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
    if (isMaxedOut(c)) return { label: 'Limit reached', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' }
    return { label: 'Active', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Coupons</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Codes customers can enter at checkout for a discount. Product sale prices are separate and apply automatically.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(s => !s)}>
          <Plus className="w-4 h-4 mr-1" /> New Coupon
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-lg p-4 mb-6 max-w-lg space-y-3 shadow-sm animate-in fade-in-50 duration-200">
          <h3 className="font-semibold text-sm text-foreground">New Coupon</h3>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Code</label>
            <div className="flex gap-2">
              <Input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. WELCOME10"
                className="uppercase"
              />
              <Button type="button" size="sm" variant="outline" onClick={generateCode}>Generate</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Discount Type</label>
              <select
                value={form.discount_type}
                onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as 'percentage' | 'fixed' }))}
                className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (KSh)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                {form.discount_type === 'percentage' ? 'Percent Off' : 'Amount Off (KSh)'}
              </label>
              <Input
                type="number" min="0" step="0.01"
                value={form.discount_value}
                onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                placeholder={form.discount_type === 'percentage' ? 'e.g. 10' : 'e.g. 500'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Minimum Order (optional)</label>
              <Input
                type="number" min="0" step="0.01"
                value={form.min_order_amount}
                onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))}
                placeholder="e.g. 2000"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Usage Limit (optional)</label>
              <Input
                type="number" min="1" step="1"
                value={form.usage_limit}
                onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value }))}
                placeholder="e.g. 100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Expires On (optional)</label>
            <Input
              type="date"
              value={form.expires_at}
              onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={createCoupon} disabled={saving} className="flex-1">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : 'Create Coupon'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setForm(emptyForm) }}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <p>Loading coupons...</p>
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-lg text-muted-foreground">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No coupons yet. Create one to offer customers a discount code at checkout.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map(c => {
            const status = statusOf(c)
            return (
              <div key={c.id} className="bg-card border border-border rounded-lg p-4 flex flex-col justify-between shadow-sm transition-all hover:shadow-md">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <button
                      onClick={() => copyCode(c.code)}
                      className="font-mono font-bold text-foreground text-base tracking-wider hover:text-primary transition-colors flex items-center gap-1.5 group"
                      title="Click to copy"
                    >
                      {c.code} 
                      <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                    </button>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  <p className="text-lg font-bold text-primary mb-2">
                    {c.discount_type === 'percentage' ? `${c.discount_value}% off` : `KSh ${c.discount_value.toLocaleString()} off`}
                  </p>

                  <div className="text-xs text-muted-foreground space-y-1 mb-4">
                    {c.min_order_amount && <p>Min. order: KSh {c.min_order_amount.toLocaleString()}</p>}
                    <p>Used: {c.times_used}{c.usage_limit ? ` / ${c.usage_limit}` : ' times'}</p>
                    {c.expires_at && <p>Expires: {new Date(c.expires_at).toLocaleDateString()}</p>}
                  </div>
                </div>

                <div className="flex gap-2 mt-auto">
                  <Button size="sm" variant="outline" onClick={() => toggleActive(c)} className="flex-1">
                    {c.is_active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deleteCoupon(c.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
