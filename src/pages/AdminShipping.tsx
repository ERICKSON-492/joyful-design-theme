import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Trash2, Edit, X, Upload, Check } from 'lucide-react'

interface ShippingMethod {
  id: string
  name: string
  type: string
  provider: string | null
  estimated_days: string | null
  price: number
  is_active: boolean
  regions: string[]
}

interface ParsedRow {
  location: string
  price: number
  type: string
  provider: string
  estimated_days: string
  existingId?: string
  status: 'new' | 'update' | 'error'
  error?: string
}

export default function AdminShipping() {
  const [methods, setMethods] = useState<ShippingMethod[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'local', provider: '', estimated_days: '', price: '', is_active: true, regions: '' })

  // ---- Bulk import state ----
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkType, setBulkType] = useState('local')
  const [bulkProvider, setBulkProvider] = useState('')
  const [bulkPreview, setBulkPreview] = useState<ParsedRow[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkParseError, setBulkParseError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetch_ = async () => {
    const { data, error } = await supabase.from('shipping_methods').select('*')
    if (error) {
      toast.error('Failed to fetch methods: ' + error.message)
      return
    }
    if (data) {
      // Debug logging to isolate row issues in the browser F12 Console
      console.log("RAW SUPABASE SHIPPING DATA:", data)
      
      // Inline normalization mapping to catch trailing spaces or casing bugs from DB
      const normalized = (data as any[]).map(m => ({
        ...m,
        type: String(m.type || 'local').toLowerCase().trim(),
        is_active: m.is_active ?? true
      }))
      setMethods(normalized)
    }
  }
  
  useEffect(() => { fetch_() }, [])

  const resetForm = () => { setForm({ name: '', type: 'local', provider: '', estimated_days: '', price: '', is_active: true, regions: '' }); setEditId(null); setShowForm(false) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const payload = {
      name: form.name.trim(), 
      type: form.type.trim(), 
      provider: form.provider.trim() || null,
      estimated_days: form.estimated_days.trim() || null,
      price: parseFloat(form.price) || 0, 
      is_active: form.is_active,
      regions: form.regions.split(',').map(r => r.trim()).filter(Boolean),
    }
    if (editId) {
      const { error } = await supabase.from('shipping_methods').update(payload).eq('id', editId)
      if (error) toast.error(error.message); else toast.success('Updated!')
    } else {
      const { error } = await supabase.from('shipping_methods').insert(payload)
      if (error) toast.error(error.message); else toast.success('Added!')
    }
    setLoading(false); resetForm(); fetch_()
  }

  const handleEdit = (m: ShippingMethod) => {
    setForm({ name: m.name, type: m.type, provider: m.provider || '', estimated_days: m.estimated_days || '', price: String(m.price), is_active: m.is_active, regions: (m.regions || []).join(', ') })
    setEditId(m.id); setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this shipping method?')) return
    await supabase.from('shipping_methods').delete().eq('id', id)
    toast.success('Deleted'); fetch_()
  }

  const resetBulkImport = () => {
    setBulkText(''); setBulkPreview([]); setBulkParseError('')
    setBulkType('local'); setBulkProvider('')
    setShowBulkImport(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const splitLine = (line: string) => {
    const delim = line.includes('\t') ? '\t' : ','
    // Replace carriage returns \r to stop hidden formatting breaking strings
    return line.replace(/\r/g, '').split(delim).map(s => s.trim())
  }

  const parseBulkText = (text: string) => {
    setBulkParseError('')
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) { setBulkPreview([]); return }

    let dataLines = lines
    const firstLower = lines[0].toLowerCase()
    if (firstLower.includes('location') && firstLower.includes('price')) {
      dataLines = lines.slice(1)
    }

    const rows: ParsedRow[] = dataLines.map((line) => {
      const cols = splitLine(line).filter(c => c.length > 0)
      const location = cols[0] || ''
      const priceRaw = cols[1] || ''
      const price = parseFloat(priceRaw.replace(/[^0-9.]/g, ''))
      
      const type = (cols[2] || bulkType).toLowerCase().trim()
      const provider = (cols[3] || bulkProvider).trim()
      const estimated_days = (cols[4] || '').trim()

      let status: ParsedRow['status'] = 'new'
      let error: string | undefined

      if (!location) { status = 'error'; error = 'Missing location' }
      else if (isNaN(price)) { status = 'error'; error = 'Missing/invalid price' }

      const existing = methods.find(
        m => m.name.toLowerCase() === location.toLowerCase() && m.type === type
      )
      if (existing && status !== 'error') status = 'update'

      return { location, price: isNaN(price) ? 0 : price, type, provider, estimated_days, existingId: existing?.id, status, error }
    })

    setBulkPreview(rows)
  }

  const handleBulkTextChange = (text: string) => {
    setBulkText(text)
    parseBulkText(text)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '')
      setBulkText(text)
      parseBulkText(text)
    }
    reader.onerror = () => setBulkParseError('Could not read that file.')
    reader.readAsText(file)
  }

  const handleConfirmImport = async () => {
    const validRows = bulkPreview.filter(r => r.status !== 'error')
    if (validRows.length === 0) { toast.error('No valid rows to import'); return }
    setBulkLoading(true)

    let successCount = 0
    let failCount = 0

    for (const row of validRows) {
      const payload = {
        name: row.location,
        type: row.type,
        provider: row.provider || null,
        estimated_days: row.estimated_days || null,
        price: row.price,
        is_active: true, 
        regions: [row.location],
      }
      
      if (row.existingId) {
        const { error } = await supabase.from('shipping_methods').update(payload).eq('id', row.existingId)
        if (error) failCount++; else successCount++
      } else {
        const { error } = await supabase.from('shipping_methods').insert(payload)
        if (error) failCount++; else successCount++
      }
    }

    setBulkLoading(false)
    if (successCount) toast.success(`Imported ${successCount} location${successCount === 1 ? '' : 's'}`)
    if (failCount) toast.error(`${failCount} row${failCount === 1 ? '' : 's'} failed`)
    resetBulkImport()
    fetch_()
  }

  const newCount = bulkPreview.filter(r => r.status === 'new').length
  const updateCount = bulkPreview.filter(r => r.status === 'update').length
  const errorCount = bulkPreview.filter(r => r.status === 'error').length

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Shipping Methods</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Fetched rows in memory: <span className="font-mono font-bold text-primary">{methods.length}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { resetBulkImport(); setShowBulkImport(true) }}>
            <Upload className="w-4 h-4 mr-1" /> Bulk Import
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(true) }}><Plus className="w-4 h-4 mr-1" /> Add Method</Button>
        </div>
      </div>

      {/* ---------- Manual Modal ---------- */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">{editId ? 'Edit' : 'Add'} Shipping Method</h2>
              <button onClick={resetForm}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="text-sm font-medium block mb-1">Name</label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
              <div><label className="text-sm font-medium block mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="local">Local (Kenya)</option><option value="international">International</option>
                </select>
              </div>
              <div><label className="text-sm font-medium block mb-1">Provider</label><Input value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium block mb-1">Estimated Days</label><Input value={form.estimated_days} onChange={e => setForm(p => ({ ...p, estimated_days: e.target.value }))} placeholder="2-5 days" /></div>
                <div><label className="text-sm font-medium block mb-1">Price (KSh)</label><Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} /></div>
              </div>
              <div><label className="text-sm font-medium block mb-1">Regions (comma-separated)</label><Input value={form.regions} onChange={e => setForm(p => ({ ...p, regions: e.target.value }))} placeholder="Nairobi, Mombasa, Nationwide" /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} id="active" />
                <label htmlFor="active" className="text-sm">Active</label>
              </div>
              <Button type="submit" disabled={loading} className="w-full">{loading ? 'Saving...' : editId ? 'Update' : 'Add'}</Button>
            </form>
          </div>
        </div>
      )}

      {/* ---------- Bulk Import Modal ---------- */}
      {showBulkImport && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">Bulk Import Locations & Prices</h2>
              <button onClick={resetBulkImport}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium block mb-1">Default Type</label>
                <select value={bulkType} onChange={e => { setBulkType(e.target.value); parseBulkText(bulkText) }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="local">Local (Kenya)</option><option value="international">International</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Default Provider</label>
                <Input value={bulkProvider} onChange={e => { setBulkProvider(e.target.value); parseBulkText(bulkText) }} placeholder="e.g. G4S" />
              </div>
            </div>

            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Paste list, or upload a CSV</label>
              <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-3 h-3 mr-1" /> Upload CSV
              </Button>
              <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
            </div>
            <textarea
              value={bulkText}
              onChange={e => handleBulkTextChange(e.target.value)}
              rows={6}
              placeholder={'Nairobi, 300\nMombasa, 500\nKisumu, 450\nNakuru, 400'}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono mb-1"
            />
            <p className="text-xs text-muted-foreground mb-4">
              One location per line: <code>Location, Price</code> — optionally add <code>, Type, Provider, Estimated Days</code> per row.
            </p>

            {bulkParseError && <p className="text-sm text-destructive mb-4">{bulkParseError}</p>}

            {bulkPreview.length > 0 && (
              <div className="mb-4">
                <div className="flex gap-3 text-xs mb-2">
                  <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">{newCount} new</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700">{updateCount} updated</span>
                  {errorCount > 0 && <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">{errorCount} error{errorCount === 1 ? '' : 's'}</span>}
                </div>
                <div className="border border-border rounded-md max-h-60 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left px-2 py-1.5">Location</th>
                        <th className="text-left px-2 py-1.5">Price</th>
                        <th className="text-left px-2 py-1.5">Type</th>
                        <th className="text-left px-2 py-1.5">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreview.map((row, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-2 py-1.5">{row.location || <span className="text-destructive">—</span>}</td>
                          <td className="px-2 py-1.5">{row.error ? <span className="text-destructive">{row.error}</span> : `KSh ${row.price.toLocaleString()}`}</td>
                          <td className="px-2 py-1.5">{row.type}</td>
                          <td className="px-2 py-1.5">
                            {row.status === 'new' && <span className="text-green-700">New</span>}
                            {row.status === 'update' && <span className="text-blue-700">Update price</span>}
                            {row.status === 'error' && <span className="text-destructive">Skipped</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <Button
              type="button"
              disabled={bulkLoading || bulkPreview.filter(r => r.status !== 'error').length === 0}
              onClick={handleConfirmImport}
              className="w-full"
            >
              {bulkLoading ? 'Importing...' : <><Check className="w-4 h-4 mr-1" /> Import {bulkPreview.filter(r => r.status !== 'error').length} Location{bulkPreview.filter(r => r.status !== 'error').length === 1 ? '' : 's'}</>}
            </Button>
          </div>
        </div>
      )}

      {/* ---------- Main View Grid ---------- */}
      <div className="space-y-6 mt-4">
        {/* Strict Formatting Mismatch Fallback Alert Block */}
        {methods.length > 0 && !methods.some(m => m.type === 'local' || m.type === 'international') && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-600 dark:text-amber-400">
            ⚠️ Rows are successfully loaded into your app state ({methods.length} found), but their database <strong>type</strong> fields do not exactly equal 'local' or 'international'. Look inside your browser console logs to see what string value they contain!
          </div>
        )}

        {['local', 'international'].map(type => {
          const group = methods.filter(m => m.type === type)
          if (group.length === 0) return null
          return (
            <div key={type}>
              <h2 className="font-display text-lg font-bold text-foreground mb-3 capitalize">
                {type === 'local' ? '🇰🇪 Local Couriers' : '🌍 International'} ({group.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.map(m => (
                  <div key={m.id} className="bg-card border border-border rounded-lg p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                    <div className="mb-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-foreground text-sm line-clamp-1">{m.name}</h3>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded shrink-0 ${m.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {m.is_active ? 'Active' : 'Off'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-primary">KSh {m.price.toLocaleString()}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                        {m.provider ? `${m.provider} • ` : ''}{m.estimated_days || 'No timeframe'}
                      </p>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => handleEdit(m)}><Edit className="w-3 h-3 mr-1" /> Edit</Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(m.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {methods.length === 0 && (
          <div className="p-12 text-center border-2 border-dashed border-muted rounded-xl text-muted-foreground text-sm">
            No shipping methods found in your database. Use 'Add Method' or 'Bulk Import' to create rows.
          </div>
        )}
      </div>
    </div>
  )
}
