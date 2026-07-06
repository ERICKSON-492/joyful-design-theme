'use client'

import { useEffect, useState } from 'react'
import lindaPortrait from '@/assets/linda-portrait.jpg'
import artisanWorking from '@/assets/artisan-working.jpg'
import { supabase } from '@/integrations/supabase/client'
import { useSEO } from '@/hooks/useSEO'
import { Loader2 } from 'lucide-react'

interface SectionContent {
  title: string
  body: string
  image_url: string | null
}

const fallbackOrigin: SectionContent = {
  title: 'Where It All Began',
  body: "In 2018, Linda received a single beaded necklace on her graduation day. It wasn't just a gift - it was a spark. That one bead carried the weight of centuries of African craftsmanship, the stories of hands that wove it, and the promise of something greater.\n\nFrom that moment, Linda began learning the art herself - studying under Maasai artisans, understanding the language of beads, colors, and patterns that had been passed down through generations.\n\nUshanga Chronicles was born from that passion. Every piece is handcrafted in Nairobi, Kenya, rooted in African heritage but designed for modern life. Each creation carries a story - not just of the artisan who made it, but of the person who wears it.\n\nToday, the Ushanga Tribe spans the globe. What started with one bead has become a thousand stories, and counting.",
  image_url: null,
}

const fallbackCraft: SectionContent = {
  title: 'The Craft',
  body: "Every piece begins with intention. The beads are carefully selected - each color holding meaning, each pattern telling a different chapter.\n\nOur artisans work by hand, using techniques that have been refined over generations. There are no machines, no shortcuts. Just skilled hands, quality materials, and the patience to create something extraordinary.\n\nFrom sisal to leather, cowrie shells to glass beads - every material is sourced with care, ensuring that each piece is not just beautiful, but built to last.",
  image_url: null,
}

export default function TheChronicle() {
  useSEO(
    'Our Story | Ushanga Chronicles', 
    'The story behind Ushanga Chronicles — handcrafted African jewelry and decor made by artisans in Nairobi, Kenya.', 
    '/about-us'
  )
  
  const [origin, setOrigin] = useState(fallbackOrigin)
  const [craft, setCraft] = useState(fallbackCraft)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timestamp, setTimestamp] = useState(Date.now())

  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout

    const fetchContent = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (isMounted) {
            setLoading(false)
            setError('Loading took too long. Showing fallback content.')
            console.warn('Supabase request timed out, using fallback content')
          }
        }, 5000) // 5 second timeout

        const { data, error: fetchError } = await supabase
          .from('site_content')
          .select('section_key, title, body, image_url')
          .in('section_key', ['about_where_it_began', 'about_the_craft'])

        // Clear timeout since we got a response
        clearTimeout(timeoutId)

        if (!isMounted) return

        if (fetchError) {
          console.error('Error fetching content:', fetchError)
          setError('Failed to load content. Using fallback content.')
          setLoading(false)
          return
        }

        // Update timestamp for cache busting
        setTimestamp(Date.now())
        
        // Process data if available
        if (data && data.length > 0) {
          data.forEach(row => {
            if (row.section_key === 'about_where_it_began') {
              setOrigin({ 
                title: row.title || fallbackOrigin.title, 
                body: row.body || fallbackOrigin.body, 
                image_url: row.image_url || null
              })
            }
            if (row.section_key === 'about_the_craft') {
              setCraft({ 
                title: row.title || fallbackCraft.title, 
                body: row.body || fallbackCraft.body, 
                image_url: row.image_url || null
              })
            }
          })
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        if (isMounted) {
          setError('An unexpected error occurred. Using fallback content.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchContent()

    // Cleanup
    return () => {
      isMounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  const renderParagraphs = (text: string) => {
    if (!text) return null
    return text.split('\n\n').filter(Boolean).map((p, i) => (
      <p key={i} className="mb-4 last:mb-0">
        {p}
      </p>
    ))
  }

  const getImageUrl = (url: string | null, fallbackSrc: string) => {
    if (!url) return fallbackSrc
    
    // If it's a Supabase storage URL, add timestamp for cache busting
    if (url.includes('supabase.co') || url.includes('storage.googleapis.com')) {
      const separator = url.includes('?') ? '&' : '?'
      return `${url}${separator}t=${timestamp}`
    }
    
    return url
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, fallbackSrc: string) => {
    const img = e.currentTarget
    if (img.src !== fallbackSrc) {
      img.src = fallbackSrc
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-display">Loading our story...</p>
      </div>
    )
  }

  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-card to-background">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-6">
            The Chronicle
          </h1>
          <p className="text-primary font-display text-xl md:text-2xl italic">
            One bead. A thousand stories.
          </p>
          {error && (
            <p className="mt-4 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
              ⚠️ {error}
            </p>
          )}
        </div>
      </section>

      {/* Linda's Story Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
            <div className="relative">
              <img
                src={getImageUrl(origin.image_url, lindaPortrait.src || lindaPortrait)}
                alt="Linda, founder of Ushanga Chronicles"
                className="w-full max-w-md mx-auto object-cover rounded-lg shadow-lg aspect-[4/3]"
                loading="lazy"
                onError={(e) => handleImageError(e, lindaPortrait.src || lindaPortrait)}
              />
              {/* Decorative border */}
              <div className="absolute -bottom-4 -right-4 w-full h-full border-2 border-primary/20 rounded-lg -z-10 hidden md:block" />
            </div>
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

      {/* The Craft Section */}
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
            <div className="relative order-1 lg:order-2">
              <img
                src={getImageUrl(craft.image_url, artisanWorking.src || artisanWorking)}
                alt="Artisan handcrafting a beaded piece"
                className="w-full max-w-md mx-auto object-cover rounded-lg shadow-lg aspect-[4/3]"
                loading="lazy"
                onError={(e) => handleImageError(e, artisanWorking.src || artisanWorking)}
              />
              {/* Decorative border */}
              <div className="absolute -bottom-4 -left-4 w-full h-full border-2 border-primary/20 rounded-lg -z-10 hidden md:block" />
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 md:py-20 bg-primary/5">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Join Our Tribe
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Every piece tells a story. Be part of ours. Explore our collection and find the piece that speaks to you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/shop"
              className="inline-flex items-center justify-center px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Shop Our Collection
            </a>
            <a
              href="/about-us"
              className="inline-flex items-center justify-center px-8 py-3 bg-card text-foreground border border-border rounded-lg font-medium hover:bg-accent transition-colors"
            >
              Learn More About Us
            </a>
          </div>
        </div>
      </section>

      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            name: 'The Chronicle - Our Story',
            description: 'The story behind Ushanga Chronicles — handcrafted African jewelry and decor made by artisans in Nairobi, Kenya.',
            url: 'https://ushangachronicles.com/about-us',
            brand: {
              '@type': 'Brand',
              name: 'Ushanga Chronicles',
            },
            founder: {
              '@type': 'Person',
              name: 'Linda',
              description: 'Founder of Ushanga Chronicles',
            },
            mainEntity: {
              '@type': 'Organization',
              name: 'Ushanga Chronicles',
              description: 'Handcrafted African jewelry and decor',
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Nairobi',
                addressCountry: 'Kenya',
              },
            },
          }),
        }}
      />
    </div>
  )
}
