import { useState } from 'react'

export function Newsletter() {
  const [email, setEmail] = useState('')

  return (
    <section id="contact" className="py-16 md:py-20 bg-secondary">
      <div className="container mx-auto px-4 text-center max-w-xl">
        <h3 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-2">
          Let's get in touch
        </h3>
        <p className="text-sm text-muted-foreground mb-6 font-body">
          Sign up to subscribe and receive 5% off your order
        </p>
        <form
          onSubmit={(e) => { e.preventDefault(); setEmail('') }}
          className="flex gap-2"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            className="flex-1 px-4 py-3 border border-border rounded-sm bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
            required
          />
          <button
            type="submit"
            className="bg-primary hover:bg-gold-dark text-primary-foreground px-6 py-3 text-sm font-semibold tracking-wider uppercase transition-colors"
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>
  )
}
