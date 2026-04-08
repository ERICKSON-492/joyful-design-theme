import { useState } from 'react'
import heroCorporate from '@/assets/hero-corporate.jpg'

const tabs = [
  {
    id: '01',
    title: 'Conference & Event Gifting',
    description: 'Artisan-crafted pieces designed to showcase your brand with authenticity and quality; featuring notebooks, tote bags, lanyards, badges, and souvenirs.',
  },
  {
    id: '02',
    title: 'Corporate Merchandise & Branding',
    description: 'A refined range of custom-branded artisan-made products designed with quality and authenticity; featuring hoodies, t-shirts, laptop sleeves, pouches, and beaded apparel.',
  },
  {
    id: '03',
    title: 'Awards & Appreciation Gifting',
    description: 'Distinctive awards and appreciation gifts inspired by African craftsmanship; featuring stone, brass and wood plaques, trophies, and figurines.',
  },
]

export function CorporateGifting() {
  const [activeTab, setActiveTab] = useState('01')

  return (
    <section id="corporate" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-4">
          <p className="text-sm tracking-widest uppercase text-muted-foreground font-body mb-2">
            Corporate Gifting
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-semibold text-foreground">
            Beautifully functional & consciously crafted
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto mt-12">
          {/* Image */}
          <div className="rounded-lg overflow-hidden">
            <img
              src={heroCorporate}
              alt="Corporate gifting products"
              className="w-full h-full object-cover"
              loading="lazy"
              width={800}
              height={600}
            />
          </div>

          {/* Tabs */}
          <div className="flex flex-col justify-center space-y-4">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`border rounded-lg p-6 cursor-pointer transition-all ${
                  activeTab === tab.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-primary font-display text-lg font-semibold">{tab.id}.</span>
                  <h3 className="font-body font-semibold text-foreground">{tab.title}</h3>
                </div>
                {activeTab === tab.id && (
                  <p className="text-sm text-muted-foreground leading-relaxed pl-8 font-body">
                    {tab.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
