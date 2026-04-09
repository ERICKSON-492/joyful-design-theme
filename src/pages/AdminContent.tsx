import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Save, Upload } from 'lucide-react'

interface SiteContent {
  id: string
  section_key: string
  title: string
  body: string
  image_url: string | null
}

export default function AdminContent() {
  const [content, setContent] = useState<SiteContent | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('site_content')
      .select('*')
      .eq('section_key', 'the_chronicle_begins')
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setContent(data)
          setTitle(data.title)
          setBody(data.body)
          setImageUrl(data.image_url || '')
        }
        setLoading(false)
      })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    if (content) {
      const { error } = await supabase
        .from('site_content')
        .update({ title, body, image_url: imageUrl || null })
        .eq('id', content.id)
      if (error) toast.error('Failed to save')
      else toast.success('Chronicle story updated!')
    } else {
      const { error } = await supabase
        .from('site_content')
        .insert({ section_key: 'the_chronicle_begins', title, body, image_url: imageUrl || null })
      if (error) toast.error('Failed to save')
      else toast.success('Chronicle story created!')
    }
    setSaving(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `site-content/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file)
    if (error) { toast.error('Upload failed'); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path)
    setImageUrl(urlData.publicUrl)
    setUploading(false)
    toast.success('Image uploaded')
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>

  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-8">Edit Chronicle Story</h1>
      <div className="max-w-2xl space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Title</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="The Chronicle Begins" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Story (separate paragraphs with blank lines)</label>
          <Textarea value={body} onChange={e => setBody(e.target.value)} rows={10} placeholder="Write the chronicle story..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Image</label>
          {imageUrl && <img src={imageUrl} alt="Preview" className="w-40 h-40 object-cover rounded mb-3" />}
          <label className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded cursor-pointer hover:bg-accent text-sm">
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Upload Image'}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
          </label>
          <p className="text-xs text-muted-foreground mt-1">Leave empty to use default photo</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
