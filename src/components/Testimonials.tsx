import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react'

const testimonials = [
  {
    quote: "We've been collaborating with Mawu Africa for three years now. Their commitment to quality and affordability is commendable. The team goes above and beyond to meet our customization requests.",
    name: 'Charlotte',
    role: 'Production Manager, White Elephant Trading, Kenya',
    title: 'Great Sourcing Partner',
  },
  {
    quote: "We had an outstanding experience working with Mawu Africa, particularly in customizing African hoodies for our staff. Their attention to detail and ability to accommodate our unique shipping needs across 10 countries is truly impressive.",
    name: 'Mitch Sauers',
    role: 'CEO, UpEnergy, US',
    title: 'Accommodated our unique shipping needs',
  },
  {
    quote: "Mawu Africa played a pivotal role in our recent conference by curating exceptional made-in-Africa gifts for our guests. Their dedication to showcasing African craftsmanship is truly commendable.",
    name: 'Steve Wamathai',
    role: 'General Partner, FrontEnd VC, Kenya',
    title: 'Our gifting partner!',
  },
  {
    quote: "My experience with Mawu has been nothing short of exceptional. Their prompt responses and attention to branding and packaging details exceeded my expectations. I'm truly impressed and highly recommend Mawu Africa.",
    name: 'Zellipah Nyathura',
    role: 'CEO, Gitzell Fairtrade, US',
    title: 'Great team! Exceeded my expectations',
  },
]

export function Testimonials() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-3xl md:text-5xl font-semibold text-primary text-center mb-16">
          Trusted by Leading Brands
        </h2>

        <div className="max-w-3xl mx-auto relative">
          <Quote className="w-10 h-10 text-primary/20 mb-6 mx-auto" />
          
          <div className="text-center min-h-[200px] flex flex-col items-center justify-center">
            <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground mb-4">
              {testimonials[current].title}
            </h3>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-6 font-body italic">
              "{testimonials[current].quote}"
            </p>
            <p className="font-body font-semibold text-foreground text-sm">
              {testimonials[current].name}
            </p>
            <p className="text-sm text-muted-foreground font-body">
              {testimonials[current].role}
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length)}
              className="p-2 border border-border rounded-full hover:border-primary transition-colors"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === current ? 'bg-primary w-6' : 'bg-border'
                  }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={() => setCurrent((c) => (c + 1) % testimonials.length)}
              className="p-2 border border-border rounded-full hover:border-primary transition-colors"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
