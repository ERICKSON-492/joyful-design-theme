import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import tribeTess from '@/assets/tribe-tess.jpeg'
import tribeAnne from '@/assets/tribe-anne.jpeg'
import tribeLuna from '@/assets/tribe-luna.jpeg'
import tribe1 from '@/assets/tribe-1.jpg'
import { ScrollReveal } from './ScrollReveal'
import { fetchPublicTable } from '@/lib/publicContent'

interface Look { image: string; name: string; piece: string }

// Shown until (or alongside, if there are fewer than 4) admin-curated /
// customer-approved looks exist in the database.
const fallbackLooks: Look[] = [
  { image: tribeTess, name: 'Tess', piece: 'Beaded Dress' },
  { image: tribeAnne, name: 'Anne', piece: 'Beaded Bracelet' },
  { image: tribeLuna, name: 'Luna', piece: 'Beaded Dog Collar' },
  { image: tribe1, name: 'Amani K.', piece: 'Layered Beaded Necklace' },
]

const VISIBLE_COUNT = 4
const ROTATE_INTERVAL_MS = 5000

const offsets = [
  'md:mt-0',
  'md:mt-12',
  'md:mt-4',
  'md:mt-16',
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  // Avoid producing the same order back-to-back
  if (arr.length > 1 && a.every((v, i) => v === arr[i])) {
    ;[a[0], a[1]] = [a[1], a[0]]
  }
  return a
}

export function TribeLooksSection() {
  const [pool, setPool] = useState<Look[]>(fallbackLooks)
  const [startIndex, setStartIndex] = useState(0)

  // Load real looks from the database (admin-curated + approved customer
  // submissions). Falls back to the bundled defaults if there aren't
  // enough approved looks yet, so the section never looks empty.
  useEffect(() => {
    fetchPublicTable<{ image_url: string; name: string; piece_name: string }>(
      'tribe_looks',
      'select=image_url,name,piece_name&status=eq.approved&order=created_at.desc&limit=16'
    )
      .then(data => {
        const live: Look[] = data.map(d => ({ image: d.image_url, name: d.name, piece: d.piece_name }))
        if (live.length >= VISIBLE_COUNT) {
          setPool(shuffle(live))
        } else if (live.length > 0) {
          // Mix real looks in with fallbacks so real submissions show up
          // right away even before there are enough to fill the grid alone.
          setPool(shuffle([...live, ...fallbackLooks]))
        } else {
          setPool(shuffle(fallbackLooks))
        }
      })
      .catch(() => setPool(shuffle(fallbackLooks)))
  }, [])

  // Rotate through the pool automatically, showing a new set of 4 every
  // few seconds when there are more looks than fit on screen at once.
  useEffect(() => {
    if (pool.length <= VISIBLE_COUNT) return
    const id = setInterval(() => {
      setStartIndex(i => (i + VISIBLE_COUNT) % pool.length)
    }, ROTATE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [pool])

  const visible = Array.from({ length: Math.min(VISIBLE_COUNT, pool.length) }, (_, i) => pool[(startIndex + i) % pool.length])

  return (
    <section className="py-20 md:py-32 bg-card overflow-hidden">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="text-center mb-16">
            <span className="text-primary font-semibold tracking-[0.3em] uppercase text-xs mb-3 block">
              Community
            </span>
            <h2 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-4">
              The Tribe Wears It
            </h2>
            <div className="w-16 h-1 bg-primary mx-auto rounded-full" />
          </div>
        </ScrollReveal>

        <motion.div
          layout
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto"
        >
          <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((look, i) => (
            <motion.div
              key={`${startIndex}-${look.name}-${i}`}
              layout
              initial={{ opacity: 0, rotate: -6, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, rotate: 0, scale: 1, y: 0 }}
              exit={{ opacity: 0, rotate: 6, scale: 0.85 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className={`group relative ${offsets[i]}`}
            >
              <motion.div
                className="relative overflow-hidden rounded-2xl shadow-lg"
                whileHover={{ y: -8, scale: 1.03, rotate: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <img
                  src={look.image}
                  alt={`${look.name} wearing ${look.piece}`}
                  className="w-full aspect-[3/4] object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                  width={600}
                  height={800}
                />
                {/* Glow overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Info overlay */}
                <div className="absolute bottom-0 left-0 right-0 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                  <div className="bg-gradient-to-t from-black/80 via-black/50 to-transparent p-5 pt-12">
                    <motion.p
                      className="text-white font-bold text-base tracking-wide"
                      initial={false}
                    >
                      {look.name}
                    </motion.p>
                    <p className="text-primary text-sm font-medium mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                      {look.piece}
                    </p>
                  </div>
                </div>

                {/* Corner accent */}
                <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-primary/0 group-hover:border-primary rounded-tr-lg transition-all duration-500 group-hover:w-12 group-hover:h-12" />
                <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-primary/0 group-hover:border-primary rounded-bl-lg transition-all duration-500 group-hover:w-12 group-hover:h-12" />
              </motion.div>
            </motion.div>
          ))}
          </AnimatePresence>
        </motion.div>

        <ScrollReveal delay={0.3}>
          <div className="text-center mt-14">
            <Link
              to="/tribe-looks"
              className="group inline-flex items-center gap-3 bg-primary hover:bg-primary/85 text-primary-foreground px-10 py-3.5 text-sm font-bold tracking-widest uppercase transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
            >
              Share Your Look
              <motion.span
                className="inline-block"
                animate={{ x: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              >
                →
              </motion.span>
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
