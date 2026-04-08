import { useState } from 'react'
import { ScrollReveal } from './ScrollReveal'

export function JoinTheTribe() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      setSubmitted(true)
      setEmail('')
    }
  }

  return (
    <section className="py-16 md:py-24 bg-foreground">
      <div className="container mx-auto px-4 text-center max-w-xl">
        <ScrollReveal>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-4">Become Part of the Story</h2>
          <p className="text-white/70 text-base leading-relaxed mb-2">
            Join the Ushanga Tribe. Get first access to new pieces, behind-the-scenes, and exclusive Tribe offers.
          </p>
          <p className="text-primary font-semibold text-sm mb-8">Join today and get 10% off your first order</p>
        </ScrollReveal>
        <ScrollReveal delay={0.2}>
          {submitted ? (
            <p className="text-primary font-display text-xl">Welcome to the Tribe! ✨</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" required maxLength={255} className="flex-1 px-5 py-4 bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" style={{ minHeight: '44px' }} />
              <button type="submit" className="bg-primary hover:bg-[#c49515] text-primary-foreground px-8 py-4 text-sm font-bold tracking-widest uppercase transition-colors whitespace-nowrap" style={{ minHeight: '44px' }}>
                Join the Tribe
              </button>
            </form>
          )}
        </ScrollReveal>
      </div>
    </section>
  )
}
