import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import catWearIt from '@/assets/cat-wear-it.jpg'
import catLiveWithIt from '@/assets/cat-live-with-it.jpg'
import catCollectibles from '@/assets/cat-collectibles.jpg'
import catPet from '@/assets/cat-pet.jpg'
import catTable from '@/assets/cat-table.jpg'
import { ScrollReveal, StaggerContainer, StaggerItem } from './ScrollReveal'
import { motion } from 'framer-motion'
import { fetchPublicTable } from '@/lib/publicContent'

const MotionLink = motion(Link)

const defaultImages: Record<string, string> = {
  'Wear It': catWearIt,
  'Live With It': catLiveWithIt,
  'Collectibles': catCollectibles,
  'For Your Pet': catPet,
  'For Your Table': catTable,
}

const categoriesBase = [
  { name: 'Wear It', href: '/shop?cat=wear-it', tagline: 'Adorn yourself' },
  { name: 'Live With It', href: '/shop?cat=live-with-it', tagline: 'Home stories' },
  { name: 'Collectibles', href: '/shop?cat=collectibles', tagline: 'Keepsakes' },
  { name: 'For Your Pet', href: '/shop?cat=pet', tagline: 'Furry tribe' },
  { name: 'For Your Table', href: '/shop?cat=table', tagline: 'Gather round' },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Bento positions for mobile (creative, asymmetric arrangement).
// Sizing is driven by aspect-ratio rather than fixed row heights, so tiles
// keep normal (square) proportions instead of stretching.
const mobileBento = [
  'col-span-4 aspect-[16/9]', // Wear It - full-size wide banner
  'col-span-2 aspect-square', // Live With It
  'col-span-2 aspect-square', // Collectibles
  'col-span-2 aspect-square', // Pet
  'col-span-2 aspect-square', // Table
]

interface CategoryImage {
  category: string
  image_url: string
}

export function ShopByCategory() {
  const [dbImages, setDbImages] = useState<Record<string, string>>({})
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const [categoriesData] = useState(() => shuffle(categoriesBase))

  useEffect(() => {
    fetchPublicTable<CategoryImage>('category_images', 'select=category,image_url')
      .then(data => {
        const map: Record<string, string> = {}
        data.forEach(item => { map[item.category] = item.image_url })
        setDbImages(map)
      })
      .catch(() => {})
      .finally(() => setImagesLoaded(true))
  }, [])

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="text-center mb-12">
            <span className="text-primary font-semibold tracking-[0.3em] uppercase text-xs mb-3 block">
              Categories
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground">
              Find Your Chronicle
            </h2>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: 64 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="h-1 bg-primary mx-auto rounded-full mt-4"
            />
          </div>
        </ScrollReveal>

        {/* Mobile: creative bento. Desktop (md+): clean 5-col strip. */}
        <StaggerContainer
          className="grid grid-cols-4 gap-2.5 md:grid-cols-5 md:gap-4 max-w-4xl mx-auto"
          staggerDelay={0.08}
        >
          {categoriesData.map((cat, i) => {
            const isBanner = mobileBento[i].includes('col-span-4')
            return (
            <StaggerItem
              key={cat.name}
              className={`${mobileBento[i]} md:col-span-1 md:aspect-square`}
            >
              <MotionLink
                to={cat.href}
                className={`group relative overflow-hidden block rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-500 h-full md:aspect-square ${isBanner ? 'bg-muted' : ''}`}
                whileHover={{ y: -6 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                {imagesLoaded ? (
                <motion.img
                  src={dbImages[cat.name] || defaultImages[cat.name]}
                  alt={cat.name}
                  className={`w-full h-full ${isBanner ? 'object-contain md:object-cover' : 'object-cover'}`}
                  loading="lazy"
                  width={600}
                  height={600}
                  whileHover={{ scale: 1.08 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
                ) : (
                  <div className="w-full h-full bg-muted animate-pulse" />
                )}
                {/* Gradient overlay for legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent group-hover:from-primary/80 group-hover:via-primary/30 transition-colors duration-500" />


                {/* Corner accents */}
                <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-white/0 group-hover:border-white rounded-tr-md transition-all duration-500" />
                <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-white/0 group-hover:border-white rounded-bl-md transition-all duration-500" />

                <div className="absolute inset-0 flex flex-col justify-end p-3 md:p-4 transition-transform duration-500 group-hover:-translate-y-1">
                  <h3 className="text-white font-display text-base md:text-base font-bold leading-tight">
                    {cat.name}
                  </h3>
                  <p className="text-white/80 text-[10px] md:text-xs tracking-wider uppercase mt-0.5">
                    {cat.tagline}
                  </p>
                </div>
              </MotionLink>
            </StaggerItem>
            )
          })}
        </StaggerContainer>
      </div>
    </section>
  )
}
