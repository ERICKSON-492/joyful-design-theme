import { useEffect, useState } from 'react'
import lindaPortrait from '@/assets/linda-portrait.jpg'
import artisanWorking from '@/assets/artisan-working.jpg'
import { supabase } from '@/integrations/supabase/client'

interface SectionContent {
  title: string
  body: string
  image_url: string | null
}

const fallbackOrigin: SectionContent = {
  title: 'Where It All Began',
  body: 'In 2018, Linda received a single beaded necklace on her graduation day. It wasn\'t just a gift - it was a spark. That one bead carried the weight of centuries of African craftsmanship, the stories of hands that wove it, and the promise of something greater.\n\nFrom that moment, Linda began learning the art herself - studying under Maasai artisans, understanding the language of beads, colors, and patterns that had been passed down through generations.\n\nUshanga Chronicles was born from that passion. Every piece is handcrafted in Nairobi, Kenya, rooted in African heritage but designed for modern life. Each creation carries a story - not just of the artisan who made it, but of the person who wears it.\n\nToday, the Ushanga Tribe spans the globe. What started with one bead has become a thousand stories, and counting.',
  image_url: null,
}

const fallbackCraft: SectionContent = {
  title: 'The Craft',
  body: 'Every piece begins with intention. The beads are carefully selected - each color holding meaning, each pattern telling a different chapter.\n\nOur artisans work by hand, using techniques that have been refined over generations. There are no machines, no shortcuts. Just skilled hands, quality materials, and the patience to create something extraordinary.\n\nFrom sisal to leather, cowrie shells to glass beads - every material is sourced with care, ensuring that each piece is not just beautiful, but built to last.',
  image_url: null,
}

export default function TheChronicle() {
  const [origin, setOrigin] = useState(fallbackOrigin)
  const [craft, setCraft] = useState(fallbackCraft)

  useEffect(() => {
    supabase
      .from('site_content')
      .select('section_key, title, body, image_url')
      .in('section_key', ['about_where_it_began', 'about_the_craft'])
      .then(({ data }) => {
        data?.forEach(row => {
          if (row.section_key === 'about_where_it_began') setOrigin({ title: row.title, body: row.body, image_url: row.image_url })
          if (row.section_key === 'about_the_craft') setCraft({ title: row.title, body: row.body, image_url: row.image_url })
        })
      })
  }, [])

  const renderParagraphs = (text: string) =>
    text.split('\n\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-6">
            The Chronicle
          </h1>
          <p className="text-primary font-display text-xl italic">
            One bead. A thousand stories.
          </p>
        </div>
      </section>

      {/* Linda's Story */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
            <img
              src={origin.image_url || lindaPortrait}
              alt="Linda, founder of Ushanga Chronicles"
              className="w-full max-w-md mx-auto"
              loading="lazy"
            />
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                {origin.title}
              </h2>
              <div className="space-y-4 text-muted-foreground text-base leading-relaxed">
                {renderParagraphs(origin.body)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Craft */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
            <div className="order-2 lg:order-1">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                {craft.title}
              </h2>
              <div className="space-y-4 text-muted-foreground text-base leading-relaxed">
                {renderParagraphs(craft.body)}
              </div>
            </div>
            <img
              src={craft.image_url || artisanWorking}
              alt="Artisan handcrafting a beaded piece"
              className="w-full max-w-md mx-auto order-1 lg:order-2"
              loading="lazy"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
