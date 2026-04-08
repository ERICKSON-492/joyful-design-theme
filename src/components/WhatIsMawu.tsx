import { Globe, Users, Leaf } from 'lucide-react'

const cards = [
  {
    icon: Globe,
    title: 'A Global Marketplace for African Craft',
    description: 'Connecting skilled African artisans to global buyers through a trusted platform for authentic, high-quality handcrafted products.',
  },
  {
    icon: Users,
    title: 'Built with Artisan Partners',
    description: 'We collaborate with skilled artisan communities to deliver design-led, scalable, and reliable craft production.',
  },
  {
    icon: Leaf,
    title: 'Building a Sustainable Creative Economy',
    description: 'By connecting our artisan partners to global markets, we transform traditional skills into sustainable income; creating dignified work, preserving heritage, and strengthening communities.',
  },
]

export function WhatIsMawu() {
  return (
    <section id="what-is-mawu" className="py-16 md:py-24 bg-card">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-3xl md:text-5xl font-semibold text-foreground text-center mb-4">
          What is Mawu Africa
        </h2>
        <div className="w-16 h-0.5 bg-primary mx-auto mb-16" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {cards.map((card) => (
            <div key={card.title} className="text-center px-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <card.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                {card.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-body">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
