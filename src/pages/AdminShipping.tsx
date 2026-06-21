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
      console.log("RAW DATABASE EXTRACT:", data)
      
      const cleanedAndNormalized = (data as any[])
        .filter(m => {
          if (!m.name || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(m.name)) {
            return false
          }
          return true
        })
        .map(m => {
          const rawType = String(m.type || 'local').toLowerCase().replace(/"/g, '').trim()
          const resolvedType = rawType === 'international' ? 'international' : 'local'

          return {
            ...m,
            type: resolvedType,
            name: String(m.name || '').replace(/"/g, '').trim(),
            provider: String(m.provider || '').replace(/"/g, '').trim(),
            estimated_days: String(m.estimated_days || '').replace(/"/g, '').trim(),
            is_active: m.is_active ?? true
          }
        })

      setMethods(cleanedAndNormalized)
    }
  }
  
  useEffect(() => { fetch_() }, [])

  const resetForm = () => { setForm({ name: '', type: 'local', provider: '', estimated_days: '', price: '', is_active: true, regions: '' }); setEditId(null); setShowForm(false) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const cleanName = form.name.trim()
    const payload = {
      name: cleanName, 
      type: form.type.trim(), 
      provider: form.provider.trim() || null,
      estimated_days: form.estimated_days.trim() || null,
      price: parseFloat(form.price) || 0, 
      is_active: form.is_active,
      regions: form.regions.split(',').map(r => r.trim()).filter(Boolean).length > 0 
        ? form.regions.split(',').map(r => r.trim()).filter(Boolean)
        : [cleanName],
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
      const location = (cols[0] || '').replace(/"/g, '').trim()
      const priceRaw = cols[1] || ''
      const price = parseFloat(priceRaw.replace(/[^0-9.]/g, ''))
      
      const type = (cols[2] || bulkType).toLowerCase().replace(/"/g, '').trim()
      const provider = (cols[3] || bulkProvider).replace(/"/g, '').trim()
      const estimated_days = (cols[4] || '').replace(/"/g, '').trim()

      let status: ParsedRow['status'] = 'new'
      let error: string | undefined

      if (!location) { status = 'error'; error = 'Missing location' }
      else if (isNaN(price)) { status = 'error'; error = 'Missing/invalid price' }

      const existing = methods.find(
        m => m.name.toLowerCase() === location.toLowerCase() && m.type === (type === 'international' ? 'international' : 'local')
      )
      if (existing && status !== 'error') status = 'update'

      return { location, price: isNaN(price) ? 0 : price, type: type === 'international' ? 'international' : 'local', provider, estimated_days, existingId: existing?.id, status, error }
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
    reader.onerror = () => setBulkParseError('Could not read file.')
    reader.readAsText(file)
  }

  const handleConfirmImport = async () => {
    const validRows = bulkPreview.filter(r => r.status !== 'error')
    if (validRows.length === 0) { toast.error('No valid data rows'); return }
    setBulkLoading(true)

    let successCount = 0
    let failCount = 0

    for (const row of validRows) {
      // Clean trailing fragments to match spatial geography lookups precisely
      const cleanLocation = row.location.trim()
      
      const payload = {
        name: cleanLocation,
        type: row.type,
        provider: row.provider || null,
        estimated_days: row.estimated_days || null,
        price: row.price,
        is_active: true, 
        regions: [cleanLocation], // Populates database array cleanly
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
    if (successCount) toast.success(`Imported ${successCount} locations successfully.`)
    if (failCount) toast.error(`${failCount} records failed.`)
    resetBulkImport()
    fetch_()
  }

  const newCount = bulkPreview.filter(r => r.status === 'new').length
  const updateCount = bulkPreview.filter(r => r.status === 'update').length
  const errorCount = bulkPreview.filter(r => r.status === 'error').length

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* ---------- Header Block ---------- */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Shipping Rates Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Active usable memory records: <span className="font-mono font-bold text-primary">{methods.length}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { resetBulkImport(); setShowBulkImport(true) }}>
            <Upload className="w-4 h-4 mr-1" /> Bulk Import
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(true) }}><Plus className="w-4 h-4 mr-1" /> Add Method</Button>
        </div>
      </div>

      {/* ---------- Manual Entry Modal ---------- */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">{editId ? 'Edit' : 'Add'} Rate</h2>
              <button onClick={resetForm}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="text-sm font-medium block mb-1">Location Name</label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
              <div><label className="text-sm font-medium block mb-1">Zone Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="local">Local (Kenya)</option><option value="international">International</option>
                </select>
              </div>
              <div><label className="text-sm font-medium block mb-1">Carrier Provider</label><Input value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium block mb-1">Estimated Days</label><Input value={form.estimated_days} onChange={e => setForm(p => ({ ...p, estimated_days: e.target.value }))} placeholder="1-2 days" /></div>
                <div><label className="text-sm font-medium block mb-1">Cost (KSh)</label><Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} /></div>
              </div>
              <div><label className="text-sm font-medium block mb-1">Regions</label><Input value={form.regions} onChange={e => setForm(p => ({ ...p, regions: e.target.value }))} placeholder="Nairobi" /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} id="active" />
                <label htmlFor="active" className="text-sm">Enabled</label>
              </div>
              <Button type="submit" disabled={loading} className="w-full">{loading ? 'Saving...' : editId ? 'Update Rate' : 'Publish Rate'}</Button>
            </form>
          </div>
        </div>
      )}

      {/* ---------- Bulk Import Modal ---------- */}
      {showBulkImport && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">Bulk Upload Shipping Matrix</h2>
              <button onClick={resetBulkImport}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium block mb-1">Fallback Type</label>
                <select value={bulkType} onChange={e => { setBulkType(e.target.value); parseBulkText(bulkText) }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="local">Local (Kenya)</option><option value="international">International</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Fallback Carrier</label>
                <Input value={bulkProvider} onChange={e => { setBulkProvider(e.target.value); parseBulkText(bulkText) }} placeholder="e.g. Courier Shuttles" />
              </div>
            </div>

            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Data Line Entries</label>
              <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-3 h-3 mr-1" /> Choose File (.csv)
              </Button>
              <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
            </div>
            <textarea
              value={bulkText}
              onChange={e => handleBulkTextChange(e.target.value)}
              rows={6}
              placeholder={'Nairobi, 300\nMombasa, 500'}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono mb-1"
            />

            {bulkParseError && <p className="text-sm text-destructive mb-4">{bulkParseError}</p>}

            {bulkPreview.length > 0 && (
              <div className="mb-4">
                <div className="flex gap-3 text-xs mb-2">
                  <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">{newCount} new</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700">{updateCount} mapped updates</span>
                  {errorCount > 0 && <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">{errorCount} structural errors</span>}
                </div>
                <div className="border border-border rounded-md max-h-60 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left px-2 py-1.5">Location Destination</th>
                        <th className="text-left px-2 py-1.5">Parsed Cost</th>
                        <th className="text-left px-2 py-1.5">Scope</th>
                        <th className="text-left px-2 py-1.5">Inferred Handling</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreview.map((row, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-2 py-1.5 font-medium">{row.location || <span className="text-destructive">—</span>}</td>
                          <td className="px-2 py-1.5">{row.error ? <span className="text-destructive">{row.error}</span> : `KSh ${row.price.toLocaleString()}`}</td>
                          <td className="px-2 py-1.5 capitalize">{row.type}</td>
                          <td className="px-2 py-1.5">
                            {row.status === 'new' && <span className="text-green-600 font-medium">Insert New Row</span>}
                            {row.status === 'update' && <span className="text-blue-600 font-medium">Update Pricing Match</span>}
                            {row.status === 'error' && <span className="text-destructive">Skip Field</span>}
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
              {bulkLoading ? 'Processing database transactions...' : <><Check className="w-4 h-4 mr-1" /> Commit {bulkPreview.filter(r => r.status !== 'error').length} Valid Rows</>}
            </Button>
          </div>
        </div>
      )}

      {/* ---------- Main View Grid Cards Layout ---------- */}
      <div className="space-y-6 mt-4">
        {['local', 'international'].map(type => {
          const group = methods.filter(m => m.type === type)
          if (group.length === 0) return null
          return (
            <div key={type} className="border border-border/40 rounded-xl p-4 bg-background/50 backdrop-blur-sm">
              <h2 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2 border-b border-border/60 pb-2">
                {type === 'local' ? '🇰🇪 Local Distribution Shipping Rates' : '🌍 International Freight Zones'} 
                <span className="text-xs bg-muted text-muted-foreground font-mono px-2 py-0.5 rounded-full">{group.length} locations assigned</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.map(m => (
                  <div key={m.id} className="bg-card border border-border/80 rounded-lg p-3.5 flex flex-col justify-between shadow-sm hover:border-primary/40 transition-all group">
                    <div className="mb-2">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-foreground text-sm tracking-tight line-clamp-1 group-hover:text-primary transition-colors">{m.name}</h3>
                        <span className={`text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded shrink-0 ${m.is_active ? 'bg-green-100/80 text-green-800 dark:bg-green-950/40 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                          {m.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-sm font-extrabold text-foreground tracking-tight">KSh {m.price.toLocaleString()}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 truncate">
                        {m.provider ? `${m.provider}` : 'Standard Delivery'} {m.estimated_days ? `• ${m.estimated_days}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 pt-2 mt-2 border-t border-border/40 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 font-medium" onClick={() => handleEdit(m)}><Edit className="w-2.5 h-2.5 mr-1" /> Edit</Button>
                      <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 font-medium text-destructive hover:bg-destructive/10 border-transparent hover:border-destructive/20" onClick={() => handleDelete(m.id)}><Trash2 className="w-2.5 h-2.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {methods.length === 0 && (
          <div className="p-16 text-center border-2 border-dashed border-border rounded-xl bg-card text-muted-foreground max-w-md mx-auto mt-12">
            <p className="font-medium text-base mb-1 text-foreground">No Renderable Rates Found</p>
            <p className="text-xs max-w-xs mx-auto">The layout stack is currently empty. Run a clean bulk upload or add singular targets to construct your map matrix.</p>
          </div>
        )}
      </div>
    </div>
  )
}
