import artisanWorking from '@/assets/artisan-working.jpg'

export function CoCreate() {
  return (
    <section className="py-16 md:py-24 bg-card">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
          <div className="rounded-lg overflow-hidden">
            <img
              src={artisanWorking}
              alt="African artisan crafting handmade products"
              className="w-full h-auto object-cover"
              loading="lazy"
              width={800}
              height={600}
            />
          </div>
          <div>
            <h3 className="font-display text-2xl md:text-4xl font-semibold text-foreground mb-4">
              Co-Create With Our Artisans
            </h3>
            <p className="text-lg text-primary font-display italic mb-4">
              Custom Collaborations
            </p>
            <p className="text-muted-foreground leading-relaxed mb-8 font-body">
              From concept to final packaging, our team works closely with you to create 
              handcrafted pieces that reflect your brand, space, and values.
            </p>
            <a
              href="#contact"
              className="inline-block border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-3 text-sm font-semibold tracking-wider uppercase transition-colors"
            >
              Book a consultation
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
