import { Link } from 'react-router-dom'

export function CustomOrderTeaser() {
  return (
    <section className="py-16 md:py-24 bg-primary">
      <div className="container mx-auto px-4 text-center max-w-3xl">
        <h2 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground mb-6">
          Something made just for you
        </h2>
        <p className="text-primary-foreground/80 text-base md:text-lg leading-relaxed mb-10">
          Every piece tells your story. Commission a custom creation from Linda. 
          From imagination to your hands — handcrafted with intention.
        </p>
        <Link
          to="/custom-order"
          className="inline-block bg-foreground text-white hover:bg-foreground/90 px-10 py-4 text-sm font-bold tracking-widest uppercase transition-colors"
          style={{ minHeight: '44px' }}
        >
          Start Your Chronicle
        </Link>
      </div>
    </section>
  )
}
