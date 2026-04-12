import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Trash2, Edit, X, CreditCard, Eye, EyeOff } from 'lucide-react'

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

const mpesaFields = [
  { key: 'consumer_key', label: 'Consumer Key', placeholder: 'Your Daraja Consumer Key', secret: true },
  { key: 'consumer_secret', label: 'Consumer Secret', placeholder: 'Your Daraja Consumer Secret', secret: true },
  { key: 'shortcode', label: 'Business Shortcode', placeholder: 'e.g. 174379', secret: false },
  { key: 'passkey', label: 'Passkey', placeholder: 'Your Lipa Na M-Pesa Passkey', secret: true },
  { key: 'environment', label: 'Environment', placeholder: 'sandbox or production', secret: false },
]

const pesapalFields = [
  { key: 'consumer_key', label: 'Consumer Key', placeholder: 'Your Pesapal Consumer Key', secret: true },
  { key: 'consumer_secret', label: 'Consumer Secret', placeholder: 'Your Pesapal Consumer Secret', secret: true },
  { key: 'environment', label: 'Environment', placeholder: 'sandbox or production', secret: false },
]

function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10"
      />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

export default function AdminPayments() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', provider: 'mpesa', is_active: true, config: {} as Record<string, string> })

  const fetch_ = async () => {
    const { data } = await supabase.from('payment_methods').select('*').order('created_at')
    if (data) setMethods(data as any)
  }
  useEffect(() => { fetch_() }, [])

  const resetForm = () => { setForm({ name: '', provider: 'mpesa', is_active: true, config: {} }); setEditId(null); setShowForm(false) }

  const getFields = (provider: string) => {
    if (provider === 'mpesa') return mpesaFields
    if (provider === 'pesapal') return pesapalFields
    return []
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const payload = { name: form.name, provider: form.provider, is_active: form.is_active, config: form.config }
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
    setForm({ name: m.name, provider: m.provider, is_active: m.is_active, config: (m.config || {}) as Record<string, string> })
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

  const updateConfigField = (key: string, value: string) => {
    setForm(p => ({ ...p, config: { ...p.config, [key]: value } }))
  }

  const fields = getFields(form.provider)
  const hasConfig = (m: PaymentMethod) => {
    const f = getFields(m.provider)
    const filled = f.filter(field => m.config?.[field.key])
    return filled.length > 0
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Payment Methods</h1>
          <p className="text-sm text-muted-foreground mt-1">Add payment providers and enter API credentials directly here.</p>
        </div>
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
              <div>
                <label className="text-sm font-medium block mb-1">Display Name</label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="e.g. M-Pesa" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Provider</label>
                <select value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value, config: {} }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {providerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Provider-specific API credential fields */}
              {fields.length > 0 && (
                <div className="border border-border rounded-lg p-4 space-y-3 bg-accent/30">
                  <h3 className="text-sm font-semibold text-foreground">API Credentials</h3>
                  <p className="text-xs text-muted-foreground">
                    {form.provider === 'mpesa' && 'Enter your Safaricom Daraja API credentials. Get them from developer.safaricom.co.ke'}
                    {form.provider === 'pesapal' && 'Enter your Pesapal API credentials. Get them from your Pesapal merchant dashboard.'}
                  </p>
                  {fields.map(field => (
                    <div key={field.key}>
                      <label className="text-sm font-medium block mb-1">{field.label}</label>
                      {field.secret ? (
                        <SecretInput
                          value={form.config[field.key] || ''}
                          onChange={v => updateConfigField(field.key, v)}
                          placeholder={field.placeholder}
                        />
                      ) : field.key === 'environment' ? (
                        <select
                          value={form.config[field.key] || 'sandbox'}
                          onChange={e => updateConfigField(field.key, e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="sandbox">Sandbox (Testing)</option>
                          <option value="production">Production (Live)</option>
                        </select>
                      ) : (
                        <Input
                          value={form.config[field.key] || ''}
                          onChange={e => updateConfigField(field.key, e.target.value)}
                          placeholder={field.placeholder}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {form.provider === 'cod' && (
                <p className="text-sm text-muted-foreground bg-accent/30 rounded-lg p-4">
                  No API credentials needed for Cash on Delivery. Just enable it and it will appear as a payment option at checkout.
                </p>
              )}

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
                <p className="text-xs text-muted-foreground">
                  {providerOptions.find(o => o.value === m.provider)?.label || m.provider}
                  {hasConfig(m) && ' • API keys configured ✓'}
                  {!hasConfig(m) && m.provider !== 'cod' && ' • ⚠ No API keys'}
                </p>
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
