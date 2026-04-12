import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Save, Upload, ChevronDown, ChevronUp } from 'lucide-react'

interface SiteContent {
  id: string
  section_key: string
  title: string
  subtitle: string | null
  body: string
  image_url: string | null
}

interface SectionConfig {
  key: string
  label: string
  description: string
  hasSubtitle?: boolean
  hasImage?: boolean
  bodyLabel?: string
  bodyPlaceholder?: string
}

const SECTIONS: SectionConfig[] = [
  {
    key: 'the_chronicle_begins',
    label: 'The Chronicle Begins (Homepage)',
    description: 'The story section on the homepage about how Ushanga started.',
    hasImage: true,
    bodyLabel: 'Story (separate paragraphs with blank lines)',
    bodyPlaceholder: 'Write the chronicle story...',
  },
  {
    key: 'custom_order_teaser',
    label: 'Custom Order Teaser (Homepage)',
    description: 'The call-to-action banner on the homepage for custom orders.',
    hasSubtitle: true,
    bodyLabel: 'Description',
    bodyPlaceholder: 'Every piece tells your story...',
  },
  {
    key: 'homepage_intro',
    label: 'Homepage Intro Text',
    description: 'Welcome text shown near the top of the homepage.',
    hasSubtitle: true,
    bodyLabel: 'Intro paragraph',
    bodyPlaceholder: 'Welcome to Ushanga Chronicles...',
  },
  {
    key: 'shop_by_category_header',
    label: 'Shop By Category Header',
    description: 'Title and subtitle for the shop-by-category section.',
    hasSubtitle: true,
    bodyLabel: 'Description',
    bodyPlaceholder: 'Browse our curated collections...',
  },
  {
    key: 'featured_products_header',
    label: 'Featured Products Header',
    description: 'Title and subtitle for the featured products section.',
    hasSubtitle: true,
    bodyLabel: 'Description',
    bodyPlaceholder: 'Handpicked favorites from our collection...',
  },
  {
    key: 'about_where_it_began',
    label: 'Where It All Began (About Page)',
    description: 'Linda\'s origin story on the Chronicle / About page.',
    hasImage: true,
    bodyLabel: 'Story (separate paragraphs with blank lines)',
    bodyPlaceholder: 'In 2018, Linda received a single beaded necklace...',
  },
  {
    key: 'about_the_craft',
    label: 'The Craft (About Page)',
    description: 'The craft section on the Chronicle / About page.',
    hasImage: true,
    bodyLabel: 'Story (separate paragraphs with blank lines)',
    bodyPlaceholder: 'Every piece begins with intention...',
  },
  {
    key: 'footer_brand',
    label: 'Footer Brand Text',
    description: 'The brand description and tagline shown in the footer.',
    bodyLabel: 'Brand description',
    bodyPlaceholder: 'One bead. A thousand stories. Handcrafted African jewelry...',
  },
  {
    key: 'footer_contact',
    label: 'Footer Contact Info',
    description: 'Phone number, email, and location shown in the footer.',
    hasSubtitle: true,
    bodyLabel: 'Address / Location',
    bodyPlaceholder: 'Nairobi, Kenya',
  },
  {
    key: 'wholesale_intro',
    label: 'Wholesale & Gifting Page',
    description: 'Intro text for the wholesale and corporate gifting page.',
    hasSubtitle: true,
    hasImage: true,
    bodyLabel: 'Page description',
    bodyPlaceholder: 'Partner with us for bulk orders...',
  },
  {
    key: 'topbar_banner',
    label: 'Top Bar Banner Text',
    description: 'The announcement banner at the very top of the site.',
    bodyLabel: 'Banner message',
    bodyPlaceholder: 'Wholesale African Craft Sourcing Made Easy | Shipping to 55+ Countries',
  },
  {
    key: 'join_the_tribe',
    label: 'Join The Tribe Section',
    description: 'Newsletter / community signup section on homepage.',
    hasSubtitle: true,
    bodyLabel: 'Description',
    bodyPlaceholder: 'Join our tribe and get updates...',
  },
]

function SectionEditor({ config, initial }: { config: SectionConfig; initial: SiteContent | null }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [subtitle, setSubtitle] = useState(initial?.subtitle || '')
  const [body, setBody] = useState(initial?.body || '')
  const [imageUrl, setImageUrl] = useState(initial?.image_url || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [open, setOpen] = useState(false)
  const [contentId, setContentId] = useState(initial?.id || null)

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      title,
      body,
      subtitle: config.hasSubtitle ? subtitle || null : null,
      image_url: config.hasImage && imageUrl ? imageUrl : null,
    }
    if (contentId) {
      const { error } = await supabase.from('site_content').update(payload).eq('id', contentId)
      if (error) toast.error('Failed to save')
      else toast.success(`${config.label} updated!`)
    } else {
      const { data, error } = await supabase.from('site_content').insert({ section_key: config.key, ...payload }).select('id').single()
      if (error) toast.error('Failed to save')
      else { toast.success(`${config.label} created!`); setContentId(data.id) }
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

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors text-left">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">{config.label}</h3>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>
      {open && (
        <div className="p-4 pt-0 space-y-4 border-t border-border">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Title</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Section title" />
          </div>
          {config.hasSubtitle && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Subtitle</label>
              <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Optional subtitle" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{config.bodyLabel || 'Body'}</label>
            <Textarea value={body} onChange={e => setBody(e.target.value)} rows={6} placeholder={config.bodyPlaceholder} />
          </div>
          {config.hasImage && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Image</label>
              {imageUrl && <img src={imageUrl} alt="Preview" className="w-32 h-32 object-cover rounded mb-2" />}
              <label className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded cursor-pointer hover:bg-accent text-sm">
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload Image'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
              <p className="text-xs text-muted-foreground mt-1">Leave empty to use default photo</p>
            </div>
          )}
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  )
}

export default function AdminContent() {
  const [contentMap, setContentMap] = useState<Record<string, SiteContent>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('site_content')
      .select('*')
      .in('section_key', SECTIONS.map(s => s.key))
      .then(({ data }) => {
        const map: Record<string, SiteContent> = {}
        data?.forEach(row => { map[row.section_key] = row })
        setContentMap(map)
        setLoading(false)
      })
  }, [])

  if (loading) return <p className="text-muted-foreground">Loading...</p>

  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">Site Content</h1>
      <p className="text-muted-foreground mb-8">Edit text and images for different sections of your website.</p>
      <div className="max-w-2xl space-y-4">
        {SECTIONS.map(config => (
          <SectionEditor key={config.key} config={config} initial={contentMap[config.key] || null} />
        ))}
      </div>
    </div>
  )
}
