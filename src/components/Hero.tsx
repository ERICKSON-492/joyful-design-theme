// In your Hero component file (e.g., src/components/Hero.tsx)
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
// Make sure these image paths are correct for your project
import heroHotels from '@/assets/hero-hotels.jpg';
import heroCorporate from '@/assets/hero-corporate.jpg';

const slides = [
  {
    image: heroCorporate,
    title: 'Corporate Gifting',
    subtitle: 'Curated, Customizable Gift Sets Hand Crafted by Artisans',
    cta: 'View Catalog',
    href: '#corporate',
  },
  {
    image: heroHotels,
    title: 'Hotels & Lodges',
    subtitle: 'Crafted for Remarkable Guest Experiences',
    cta: 'View Catalog',
    href: '#collections',
  },
];

export function Hero() {
  const [current, setCurrent] = useState(0);

  // Auto-rotate slides
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (index: number) => setCurrent(index);
  const prev = () => setCurrent((c) => (c - 1 + slides.length) % slides.length);
  const next = () => setCurrent((c) => (c + 1) % slides.length);

  return (
    <section className="relative w-full h-[70vh] md:h-[80vh] lg:h-screen overflow-hidden">
      {slides.map((slide, i) => {
        const isCurrent = i === current;
        return (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
            aria-hidden={!isCurrent}
          >
            {/* Image */}
            <img
              src={slide.image}
              alt={slide.title}
              className="absolute inset-0 w-full h-full object-cover object-center"
              fetchPriority={i === 0 ? "high" : "auto"}
              loading={i === 0 ? "eager" : "lazy"}
            />

            {/* Stronger, gradient overlay for text readability (dark at bottom, fading up) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

            {/* Content container - text is now clearly visible */}
            <div className="relative z-20 flex flex-col items-center justify-center h-full text-center px-4 sm:px-6 max-w-4xl mx-auto">
              <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 drop-shadow-lg">
                {slide.title}
              </h2>
              <p className="text-white/90 text-lg sm:text-xl md:text-2xl mb-8 max-w-2xl drop-shadow">
                {slide.subtitle}
              </p>
              <a
                href={slide.href}
                className="inline-block bg-amber-600 hover:bg-amber-700 text-white font-semibold px-8 py-3 rounded-md transition transform hover:scale-105 shadow-lg"
              >
                {slide.cta}
              </a>
            </div>
          </div>
        );
      })}

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-sm transition">
            <ChevronLeft size={28} />
          </button>
          <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-sm transition">
            <ChevronRight size={28} />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`transition-all duration-300 ${
                i === current ? 'w-10 bg-amber-500' : 'w-3 bg-white/60'
              } h-2 rounded-full`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
