import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Upload, Save } from 'lucide-react'

const categories = ['Wear It', 'Live With It', 'For Your Table', 'Collectibles', 'For Your Pet']

interface CategoryImage {
  id: string
  category: string
  image_url: string
}

export default function AdminCategories() {
  const [categoryImages, setCategoryImages] = useState<Record<string, CategoryImage>>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchImages = async () => {
    const { data } = await supabase.from('category_images').select('*')
    if (data) {
      const map: Record<string, CategoryImage> = {}
      data.forEach((item) => { map[item.category] = item })
      setCategoryImages(map)
    }
    setLoading(false)
  }

  useEffect(() => { fetchImages() }, [])

  const handleUpload = async (category: string, file: File) => {
    setUploading(category)
    const ext = file.name.split('.').pop()
    const path = `categories/${category.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file)
    if (uploadError) {
      toast.error('Upload failed: ' + uploadError.message)
      setUploading(null)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)

    const existing = categoryImages[category]
    if (existing) {
      const { error } = await supabase.from('category_images').update({ image_url: publicUrl }).eq('id', existing.id)
      if (error) toast.error(error.message)
      else toast.success(`${category} image updated!`)
    } else {
      const { error } = await supabase.from('category_images').insert({ category, image_url: publicUrl })
      if (error) toast.error(error.message)
      else toast.success(`${category} image saved!`)
    }
    setUploading(null)
    fetchImages()
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Category Images</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload images for each "Find Your Chronicle" category on the homepage</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map(cat => {
          const img = categoryImages[cat]
          return (
            <div key={cat} className="bg-card border border-border rounded-lg overflow-hidden">
              {img?.image_url ? (
                <img src={img.image_url} alt={cat} className="w-full h-48 object-cover" />
              ) : (
                <div className="w-full h-48 bg-muted flex items-center justify-center text-muted-foreground text-sm">
                  No image set
                </div>
              )}
              <div className="p-4">
                <h3 className="font-semibold text-foreground mb-3">{cat}</h3>
                <label className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md cursor-pointer hover:bg-accent transition-colors text-sm">
                  <Upload className="w-4 h-4" />
                  {uploading === cat ? 'Uploading...' : img ? 'Change Image' : 'Upload Image'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading === cat}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleUpload(cat, file)
                    }}
                  />
                </label>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
