import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import catWearIt from '@/assets/cat-wear-it.jpg'
import catLiveWithIt from '@/assets/cat-live-with-it.jpg'
import catCollectibles from '@/assets/cat-collectibles.jpg'
import catPet from '@/assets/cat-pet.jpg'
import catTable from '@/assets/cat-table.jpg'
import { ScrollReveal, StaggerContainer, StaggerItem } from './ScrollReveal'
import { fetchPublicTable } from '@/lib/publicContent'

const defaultImages: Record<string, string> = {
  'Wear It': catWearIt,
  'Live With It': catLiveWithIt,
  'Collectibles': catCollectibles,
  'For Your Pet': catPet,
  'For Your Table': catTable,
}

const categoriesData = [
  { name: 'Wear It', href: '/shop?cat=wear-it' },
  { name: 'Live With It', href: '/shop?cat=live-with-it' },
  { name: 'Collectibles', href: '/shop?cat=collectibles' },
  { name: 'For Your Pet', href: '/shop?cat=pet' },
  { name: 'For Your Table', href: '/shop?cat=table' },
]

interface CategoryImage {
  category: string
  image_url: string
}

export function ShopByCategory() {
  const [dbImages, setDbImages] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchPublicTable<CategoryImage>('category_images', 'select=category,image_url')
      .then(data => {
        const map: Record<string, string> = {}
        data.forEach(item => { map[item.category] = item.image_url })
        setDbImages(map)
      })
      .catch(() => {})
  }, [])

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-center text-foreground mb-14">
            Find Your Chronicle
          </h2>
        </ScrollReveal>
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 max-w-4xl mx-auto" staggerDelay={0.08}>
          {categoriesData.map((cat) => (
            <StaggerItem key={cat.name}>
              <Link to={cat.href} className="group relative overflow-hidden aspect-square block rounded-md">
                <img
                  src={dbImages[cat.name] || defaultImages[cat.name]}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                  width={400}
                  height={400}
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-primary/60 transition-colors duration-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <h3 className="text-white font-display text-sm md:text-base font-bold text-center px-2">{cat.name}</h3>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}
