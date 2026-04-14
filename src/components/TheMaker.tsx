import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import lindaPortrait from '@/assets/linda-portrait.jpg'
import { ScrollReveal } from './ScrollReveal'
import { fetchPublicTable } from '@/lib/publicContent'

interface ChronicleContent {
  title: string
  body: string
  image_url: string | null
}

const fallback: ChronicleContent = {
  title: 'The Chronicle Begins',
  body: 'It started with one bead. A single beaded necklace, gifted to Linda on her graduation day in 2018. That moment sparked something — a deep connection to the craft, the culture, and the stories each bead carries.\n\nWhat began as a passion project grew into Ushanga Chronicles — a brand rooted in African heritage, handcrafted by skilled artisans, and worn by the Ushanga Tribe across the world.',
  image_url: null,
}

export function TheMaker() {
  const [content, setContent] = useState<ChronicleContent>(fallback)

  useEffect(() => {
    fetchPublicTable<{ title: string; body: string; image_url: string | null }>(
      'site_content',
      'select=title,body,image_url&section_key=eq.the_chronicle_begins'
    ).then((rows) => {
      if (rows[0]) setContent({ title: rows[0].title, body: rows[0].body, image_url: rows[0].image_url })
    })
  }, [])

  const paragraphs = content.body.split('\n\n').filter(Boolean)

  return (
    <section className="py-16 md:py-24 bg-card">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
          <ScrollReveal direction="right" className="order-2 lg:order-1">
            <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-6">{content.title}</h2>
            {paragraphs.map((p, i) => (
              <p key={i} className={`text-muted-foreground text-base md:text-lg leading-relaxed ${i < paragraphs.length - 1 ? 'mb-4' : 'mb-8'}`}>
                {p}
              </p>
            ))}
            <Link to="/about-us" className="inline-block border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-3 text-sm font-bold tracking-widest uppercase transition-colors" style={{ minHeight: '44px' }}>
              Read the Full Story
            </Link>
          </ScrollReveal>
          <ScrollReveal direction="left" className="order-1 lg:order-2">
            <img src={content.image_url || lindaPortrait} alt="Linda, founder of Ushanga Chronicles" className="w-full max-w-md mx-auto lg:max-w-none" loading="lazy" width={600} height={800} />
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
