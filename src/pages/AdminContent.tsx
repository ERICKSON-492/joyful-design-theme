'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Save, Upload, ChevronDown, ChevronUp, X, Loader2, Image as ImageIcon } from 'lucide-react'

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
  defaults?: { title?: string; subtitle?: string; body?: string }
}

const SECTIONS: SectionConfig[] = [
  {
    key: 'about_where_it_began',
    label: "Where It All Began (Linda's Story)",
    description: "Linda's origin story shown on The Chronicle page.",
    hasImage: true,
    bodyLabel: 'Story (separate paragraphs with blank lines)',
    bodyPlaceholder: 'In 2018, Linda received a single beaded necklace...',
    defaults: {
      title: 'Where It All Began',
      body: "In 2018, Linda received a single beaded necklace on her graduation day. It wasn't just a gift - it was a spark. That one bead carried the weight of centuries of African craftsmanship, the stories of hands that wove it, and the promise of something greater.\n\nFrom that moment, Linda began learning the art herself - studying under Maasai artisans, understanding the language of beads, colors, and patterns that had been passed down through generations.\n\nUshanga Chronicles was born from that passion. Every piece is handcrafted in Nairobi, Kenya, rooted in African heritage but designed for modern life. Each creation carries a story - not just of the artisan who made it, but of the person who wears it.\n\nToday, the Ushanga Tribe spans the globe. What started with one bead has become a thousand stories, and counting.",
    },
  },
  {
    key: 'about_the_craft',
    label: 'The Craft (About Section)',
    description: 'The description of artisan methods shown on The Chronicle page.',
    hasImage: true,
    bodyLabel: 'Story (separate paragraphs with blank lines)',
    bodyPlaceholder: 'Every piece begins with intention...',
    defaults: {
      title: 'The Craft',
      body: 'Every piece begins with intention. The beads are carefully selected - each color holding meaning, each pattern telling a different chapter.\n\nOur artisans work by hand, using techniques that have been refined over generations. There are no machines, no shortcuts. Just skilled hands, quality materials, and the patience to create something extraordinary.\n\nFrom sisal to leather, cowrie shells to glass beads - every material is sourced with care, ensuring that each piece is not just beautiful, but built to last.',
    },
  },
  {
    key: 'the_chronicle_begins',
    label: 'The Chronicle Begins (Homepage Snapshot)',
    description: 'The story teaser segment appearing on the home landing page.',
    hasImage: true,
    bodyLabel: 'Story paragraphs',
    bodyPlaceholder: 'Write the homepage snapshot story...',
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
    key: 'about_storyboard',
    label: 'Storyboard Showcase (About Page Behind-the-Scenes)',
    description: 'The media banner running directly below your process workflow.',
    hasImage: true,
    bodyLabel: 'Caption text',
    bodyPlaceholder: 'Enter a caption for this layout graphic...',
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
  const [title, setTitle] = useState(initial?.title || config.defaults?.title || '')
  const [subtitle, setSubtitle] = useState(initial?.subtitle || config.defaults?.subtitle || '')
  const [body, setBody] = useState(initial?.body || config.defaults?.body || '')
  const [imageUrl, setImageUrl] = useState(initial?.image_url || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [open, setOpen] = useState(false)
  const [contentId, setContentId] = useState(initial?.id || null)
  const [imageTimestamp, setImageTimestamp] = useState(Date.now())
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Create preview URL when file is selected
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreviewUrl(null)
  }, [selectedFile])

  const handleSave = async () => {
    setSaving(true)
    
    try {
      let finalImageUrl = imageUrl

      // If there's a selected file, upload it first
      if (selectedFile) {
        setUploading(true)
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${config.key}-${Date.now()}.${fileExt}`
        const filePath = `site-images/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('site_images')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          toast.error('Failed to upload image')
          setSaving(false)
          setUploading(false)
          return
        }

        const { data: { publicUrl } } = supabase.storage
          .from('site_images')
          .getPublicUrl(filePath)

        finalImageUrl = publicUrl
        setImageUrl(finalImageUrl)
        setSelectedFile(null)
        setPreviewUrl(null)
        setImageTimestamp(Date.now())
        toast.success('Image uploaded successfully')
      }

      const payload = {
        title,
        body,
        subtitle: config.hasSubtitle ? subtitle || null : null,
        image_url: config.hasImage && finalImageUrl ? finalImageUrl : null,
      }

      if (contentId) {
        const { error } = await supabase.from('site_content').update(payload).eq('id', contentId)
        if (error) {
          toast.error('Failed to save changes')
          console.error('Update error:', error)
        } else {
          toast.success(`${config.label} successfully updated!`)
        }
      } else {
        const { data, error } = await supabase
          .from('site_content')
          .insert({ section_key: config.key, ...payload })
          .select('id')
          .single()
        
        if (error) {
          toast.error('Failed to initialize content section')
          console.error('Insert error:', error)
        } else {
          toast.success(`${config.label} successfully created!`)
          setContentId(data.id)
        }
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('An error occurred')
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      e.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB')
      e.target.value = ''
      return
    }

    setSelectedFile(file)
    toast.success(`Selected: ${file.name}`)
  }

  const handleRemoveImage = async () => {
    if (!imageUrl) return
    
    // If there's a selected file, just clear it
    if (selectedFile) {
      setSelectedFile(null)
      setPreviewUrl(null)
      toast.success('Image selection cleared')
      return
    }

    // Otherwise remove from storage
    if (!confirm('Are you sure you want to remove this image?')) return

    try {
      // Extract file path from URL
      const url = new URL(imageUrl)
      const pathParts = url.pathname.split('/')
      const bucketIndex = pathParts.indexOf('site_images')
      if (bucketIndex !== -1) {
        const filePath = pathParts.slice(bucketIndex + 1).join('/')
        
        const { error: deleteError } = await supabase.storage
          .from('site_images')
          .remove([filePath])
        
        if (deleteError) {
          console.error('Delete error:', deleteError)
          toast.error('Failed to delete image from storage')
        }
      }

      // Update database
      const { error: updateError } = await supabase
        .from('site_content')
        .update({ image_url: null })
        .eq('id', contentId)

      if (updateError) {
        toast.error('Failed to remove image from content')
      } else {
        setImageUrl('')
        setImageTimestamp(Date.now())
        toast.success('Image removed successfully')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to remove image')
    }
  }

  const displayImage = previewUrl || imageUrl

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button 
        onClick={() => setOpen(!open)} 
        className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors text-left"
      >
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">{config.label}</h3>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>
      
      {open && (
        <div className="p-4 pt-0 space-y-4 border-t border-border">
          <div className="mt-4">
            <label className="block text-sm font-medium text-foreground mb-1">Title</label>
            <Input 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="Section title" 
            />
          </div>
          
          {config.hasSubtitle && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Subtitle</label>
              <Input 
                value={subtitle} 
                onChange={e => setSubtitle(e.target.value)} 
                placeholder="Optional subtitle" 
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {config.bodyLabel || 'Body'}
            </label>
            <Textarea 
              value={body} 
              onChange={e => setBody(e.target.value)} 
              rows={6} 
              placeholder={config.bodyPlaceholder} 
            />
          </div>
          
          {config.hasImage && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Image
              </label>
              
              {/* Image Preview */}
              {displayImage && (
                <div className="relative inline-block mb-3">
                  <img 
                    src={displayImage.includes('?') ? displayImage : `${displayImage}?t=${imageTimestamp}`} 
                    alt="Preview" 
                    className="w-40 h-40 object-cover rounded-lg border border-border shadow-sm" 
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    disabled={uploading}
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {/* File Upload */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <label className={`
                  inline-flex items-center gap-2 px-4 py-2.5 border-2 border-dashed rounded-lg 
                  cursor-pointer hover:bg-accent/50 transition-all text-sm font-medium
                  ${selectedFile ? 'border-primary bg-primary/5' : 'border-border'}
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}>
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      {selectedFile ? 'Change Image' : displayImage ? 'Replace Image' : 'Choose Image'}
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileSelect} 
                    disabled={uploading} 
                  />
                </label>
                
                {selectedFile && (
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                  </span>
                )}
              </div>
              
              <div className="mt-2 space-y-1">
                <p className="text-xs text-muted-foreground">
                  {selectedFile ? 'Image will be uploaded when you save' : 'Upload a new image or select from your computer'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Supported: JPG, PNG, WEBP • Max: 5MB
                </p>
                {imageUrl && !selectedFile && (
                  <p className="text-xs text-green-600">
                    ✓ Current image uploaded
                  </p>
                )}
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-4 pt-2">
            <Button 
              onClick={handleSave} 
              disabled={saving || uploading} 
              className="gap-2 min-w-[120px]"
            >
              {saving || uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploading ? 'Uploading...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
            
            {selectedFile && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedFile(null)
                  setPreviewUrl(null)
                }}
                disabled={uploading}
              >
                Cancel Upload
              </Button>
            )}
          </div>
          
          {selectedFile && (
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
              ⚠️ You have a new image selected. Click "Save Changes" to upload it.
            </div>
          )}
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
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching content:', error)
          toast.error('Failed to load content')
        } else {
          const map: Record<string, SiteContent> = {}
          data?.forEach(row => { map[row.section_key] = row })
          setContentMap(map)
        }
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div className="flex justify-center items-center min-h-[400px]">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Loading content...</span>
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">Site Content</h1>
      <p className="text-muted-foreground mb-8">Edit text and images for different sections of your website.</p>
      <div className="space-y-4">
        {SECTIONS.map(config => (
          <SectionEditor key={config.key} config={config} initial={contentMap[config.key] || null} />
        ))}
      </div>
    </div>
  )
}
