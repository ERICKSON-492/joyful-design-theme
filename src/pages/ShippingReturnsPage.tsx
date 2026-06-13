import { useEffect } from 'react'
import { Truck, Globe2, Clock, RotateCcw, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ShippingReturnsPage() {
  useEffect(() => {
    document.title = 'Shipping & Returns – Ushanga Chronicles'
  }, [])

  return (
    <div className="bg-background">
      <section className="py-16 md:py-20 bg-card border-b border-border">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-4">
            Shipping &amp; Returns
          </h1>
          <p className="text-muted-foreground text-lg">
            Every Ushanga piece is hand-finished in Nairobi and shipped with care — here is what to expect.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl space-y-12">
          {/* Local */}
          <article className="bg-card border border-border rounded-xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Truck className="w-6 h-6" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">Local Delivery — Nairobi &amp; Kenya</h2>
            </div>
            <ul className="space-y-2 text-foreground/80 leading-relaxed list-disc pl-5">
              <li><strong>Nairobi (CBD &amp; suburbs):</strong> same-day or next-day rider delivery on in-stock pieces.</li>
              <li><strong>Upcountry:</strong> 2–4 business days via our trusted courier partners (G4S, Wells Fargo, Pickup Mtaani).</li>
              <li>Delivery fees are calculated at checkout based on your selected town and courier.</li>
              <li>You will receive an SMS &amp; email tracking link the moment your order ships.</li>
            </ul>
          </article>

          {/* International */}
          <article className="bg-card border border-border rounded-xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Globe2 className="w-6 h-6" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">International Shipping</h2>
            </div>
            <ul className="space-y-2 text-foreground/80 leading-relaxed list-disc pl-5">
              <li>We ship worldwide through DHL Express and registered Kenya Post EMS.</li>
              <li><strong>Transit time:</strong> 5–10 business days to most destinations (USA, UK, EU, Australia, Canada).</li>
              <li>Shipping rates are calculated by weight and destination at checkout.</li>
              <li><strong>Duties &amp; taxes:</strong> import duties levied by your country are the buyer's responsibility; DHL will contact you if anything is due on delivery.</li>
              <li>Every international parcel ships with a tracking number and insurance against loss.</li>
            </ul>
          </article>

          {/* Custom Orders */}
          <article className="bg-card border border-border rounded-xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">Custom Order Processing Times</h2>
            </div>
            <ul className="space-y-2 text-foreground/80 leading-relaxed list-disc pl-5">
              <li><strong>Made-to-order jewelry:</strong> 7–14 business days from confirmed deposit.</li>
              <li><strong>Custom home decor &amp; tableware:</strong> 2–4 weeks depending on size and beadwork complexity.</li>
              <li><strong>Wholesale &amp; corporate gifting:</strong> 3–6 weeks for batches over 25 pieces. Reach out early.</li>
              <li>You will receive a photo preview of your piece before it ships for approval.</li>
            </ul>
            <Link to="/custom-order" className="inline-block mt-5 text-primary font-semibold hover:underline">
              Start your custom piece →
            </Link>
          </article>

          {/* Returns */}
          <article className="bg-card border border-border rounded-xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">Returns &amp; Exchanges</h2>
            </div>
            <ul className="space-y-2 text-foreground/80 leading-relaxed list-disc pl-5">
              <li>Ready-to-ship pieces can be returned within <strong>7 days</strong> of delivery in unused, original condition.</li>
              <li>Custom and made-to-order pieces are non-refundable but may be exchanged if defective on arrival.</li>
              <li>Return shipping is paid by the buyer unless the item arrived damaged or incorrect.</li>
              <li>Refunds are issued to the original payment method within 5 business days of receiving the return.</li>
            </ul>
          </article>

          {/* Contact */}
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-3">Questions about a delivery or return?</p>
            <a
              href="mailto:admin@ushangachronicles.com"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold hover:bg-primary/90 transition-colors"
              style={{ minHeight: '44px' }}
            >
              <Mail className="w-4 h-4" /> admin@ushangachronicles.com
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}