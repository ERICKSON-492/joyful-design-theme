import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Trash2, Edit, X, CreditCard } from 'lucide-react'

interface PaymentMethod {
  id: string
  name: string
  provider: string
  is_active: boolean
  config: Record<string, any>
}

const providerOptions = [
  { value: 'mpesa', label: 'M-Pesa (Daraja STK Push)' },
  { value: 'pesapal', label: 'Pesapal' },
  { value: 'cod', label: 'Cash on Delivery' },
]

export default function AdminPayments() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', provider: 'mpesa', is_active: true, config: '{}' })

  const fetch_ = async () => {
    const { data } = await supabase.from('payment_methods').select('*').order('created_at')
    if (data) setMethods(data as any)
  }
  useEffect(() => { fetch_() }, [])

  const resetForm = () => { setForm({ name: '', provider: 'mpesa', is_active: true, config: '{}' }); setEditId(null); setShowForm(false) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    let config: Record<string, any> = {}
    try { config = JSON.parse(form.config) } catch { toast.error('Invalid JSON config'); setLoading(false); return }
    const payload = { name: form.name, provider: form.provider, is_active: form.is_active, config }
    if (editId) {
      const { error } = await supabase.from('payment_methods').update(payload).eq('id', editId)
      if (error) toast.error(error.message); else toast.success('Updated!')
    } else {
      const { error } = await supabase.from('payment_methods').insert(payload)
      if (error) toast.error(error.message); else toast.success('Added!')
    }
    setLoading(false); resetForm(); fetch_()
  }

  const handleEdit = (m: PaymentMethod) => {
    setForm({ name: m.name, provider: m.provider, is_active: m.is_active, config: JSON.stringify(m.config || {}, null, 2) })
    setEditId(m.id); setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this payment method?')) return
    await supabase.from('payment_methods').delete().eq('id', id)
    toast.success('Deleted'); fetch_()
  }

  const toggleActive = async (m: PaymentMethod) => {
    await supabase.from('payment_methods').update({ is_active: !m.is_active }).eq('id', m.id)
    toast.success(m.is_active ? 'Disabled' : 'Enabled')
    fetch_()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Payment Methods</h1>
        <Button onClick={() => { resetForm(); setShowForm(true) }}><Plus className="w-4 h-4 mr-1" /> Add Method</Button>
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">{editId ? 'Edit' : 'Add'} Payment Method</h2>
              <button onClick={resetForm}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="text-sm font-medium block mb-1">Display Name</label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="e.g. M-Pesa" /></div>
              <div><label className="text-sm font-medium block mb-1">Provider</label>
                <select value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {providerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Configuration (JSON)</label>
                <textarea value={form.config} onChange={e => setForm(p => ({ ...p, config: e.target.value }))}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono min-h-[100px]"
                  placeholder='{"mode": "sandbox"}' />
                <p className="text-xs text-muted-foreground mt-1">
                  {form.provider === 'pesapal' && 'Add consumer_key, consumer_secret here. Contact Pesapal for credentials.'}
                  {form.provider === 'mpesa' && 'M-Pesa is configured via server secrets (shortcode, passkey, etc.)'}
                  {form.provider === 'cod' && 'No config needed for Cash on Delivery'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} id="active" />
                <label htmlFor="active" className="text-sm">Active (visible to customers)</label>
              </div>
              <Button type="submit" disabled={loading} className="w-full">{loading ? 'Saving...' : editId ? 'Update' : 'Add'}</Button>
            </form>
          </div>
        </div>
      )}
      <div className="grid gap-3">
        {methods.map(m => (
          <div key={m.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-semibold text-foreground text-sm">{m.name}</h3>
                <p className="text-xs text-muted-foreground">{providerOptions.find(o => o.value === m.provider)?.label || m.provider}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleActive(m)} className={`text-xs px-3 py-1 rounded font-medium transition-colors ${m.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                {m.is_active ? 'Active' : 'Disabled'}
              </button>
              <Button size="sm" variant="outline" onClick={() => handleEdit(m)}><Edit className="w-3 h-3" /></Button>
              <Button size="sm" variant="outline" onClick={() => handleDelete(m.id)} className="text-destructive"><Trash2 className="w-3 h-3" /></Button>
            </div>
          </div>
        ))}
        {methods.length === 0 && <p className="text-center text-muted-foreground py-8">No payment methods configured yet.</p>}
      </div>
    </div>
  )
}
