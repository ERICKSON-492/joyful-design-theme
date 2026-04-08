import { Link } from 'react-router-dom'

export default function WholesalePage() {
  return (
    <div className="bg-background">
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-6">
            Wholesale & Gifting
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Bulk orders, corporate gifting, and event branding — all handcrafted with 
            the same care and quality as every individual piece.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-card p-8 border border-border">
              <h3 className="font-display text-xl font-bold text-foreground mb-3">Corporate Gifting</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Custom branded gift sets for conferences, events, and appreciation packages. 
                Each piece reflects your brand with African authenticity.
              </p>
              <a
                href="https://wa.me/254748207000?text=Hi! I'm interested in corporate gifting."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-primary text-primary-foreground px-6 py-3 text-xs font-bold tracking-wider uppercase"
              >
                Start a Conversation
              </a>
            </div>
            <div className="bg-card p-8 border border-border">
              <h3 className="font-display text-xl font-bold text-foreground mb-3">Bulk Orders</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Retail, hospitality, or resale — order in quantities with competitive pricing. 
                Minimum order quantities apply.
              </p>
              <a
                href="https://wa.me/254748207000?text=Hi! I'm interested in wholesale bulk orders."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-primary text-primary-foreground px-6 py-3 text-xs font-bold tracking-wider uppercase"
              >
                Start a Conversation
              </a>
            </div>
            <div className="bg-card p-8 border border-border md:col-span-2">
              <h3 className="font-display text-xl font-bold text-foreground mb-3">Event Branding</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Make your event unforgettable with custom beaded merchandise — lanyards, badges, 
                keyrings, and more, all handcrafted and branded to your specifications.
              </p>
              <a
                href="https://wa.me/254748207000?text=Hi! I'm interested in event branding."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-primary text-primary-foreground px-6 py-3 text-xs font-bold tracking-wider uppercase"
              >
                Start a Conversation
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
