import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import tribeTess from '@/assets/tribe-tess.jpeg'
import tribeAnne from '@/assets/tribe-anne.jpeg'
import tribeLuna from '@/assets/tribe-luna.jpeg'
import tribe1 from '@/assets/tribe-1.jpg'
import { ScrollReveal } from './ScrollReveal'

const tribeLooks = [
  { image: tribeTess, name: 'Tess', piece: 'Beaded Dress' },
  { image: tribeAnne, name: 'Anne', piece: 'Beaded Bracelet' },
  { image: tribeLuna, name: 'Luna', piece: 'Beaded Dog Collar' },
  { image: tribe1, name: 'Amani K.', piece: 'Layered Beaded Necklace' },
]

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
  const [order, setOrder] = useState(tribeLooks)

  useEffect(() => {
    // Initial shuffle so each visit feels fresh
    setOrder(prev => shuffle(prev))
    const id = setInterval(() => {
      setOrder(prev => shuffle(prev))
    }, 5000)
    return () => clearInterval(id)
  }, [])

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
          <AnimatePresence initial={false}>
          {order.map((look, i) => (
            <motion.div
              key={look.name}
              layout
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className={`group relative ${offsets[i]}`}
            >
              <motion.div
                className="relative overflow-hidden rounded-2xl shadow-lg"
                whileHover={{ y: -8, scale: 1.03 }}
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
