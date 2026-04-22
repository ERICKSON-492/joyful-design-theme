import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Truck, Sparkles, Heart, MessageCircle } from 'lucide-react'

interface FaqItem {
  q: string
  a: string
}

interface FaqSection {
  id: string
  title: string
  icon: React.ElementType
  intro: string
  items: FaqItem[]
}

const SECTIONS: FaqSection[] = [
  {
    id: 'shipping',
    title: 'Shipping & Delivery',
    icon: Truck,
    intro: 'Everything you need to know about getting your piece to your door.',
    items: [
      {
        q: 'How long does delivery take within Kenya?',
        a: 'Nairobi orders are dispatched within 1–2 business days and typically arrive in 1–3 days via our local courier partners. Orders outside Nairobi take 3–5 business days depending on your location.'
      },
      {
        q: 'Do you ship internationally?',
        a: 'Yes! We ship worldwide via DHL and EMS. International delivery takes 7–14 business days. Shipping rates and the available carriers will be calculated automatically at checkout based on your destination.'
      },
      {
        q: 'How much does shipping cost?',
        a: 'Shipping is calculated at checkout based on your delivery location. Local Kenyan delivery starts from KSh 300, while international rates vary by country and parcel weight.'
      },
      {
        q: 'Will I receive tracking information?',
        a: 'Absolutely. Once your order ships you will receive an email with your tracking number. You can also view your order status anytime from the "My Orders" page when logged in.'
      },
      {
        q: 'What if I am not home for delivery?',
        a: 'Our courier will attempt delivery up to 3 times and will call ahead. You can also nominate a trusted recipient at checkout or have your order held at the nearest pickup point.'
      },
    ]
  },
  {
    id: 'custom-orders',
    title: 'Custom Orders',
    icon: Sparkles,
    intro: 'Commission a one-of-a-kind Chronicle made just for you.',
    items: [
      {
        q: 'How do I place a custom order?',
        a: 'Visit our "Create Yours" page and complete the 5-step Chronicle form — choose a category, share your colour palette, materials and the story behind your piece. Linda will personally reach out within 48 hours to confirm details and pricing.'
      },
      {
        q: 'How long does a custom piece take to make?',
        a: 'Most custom pieces take 2–4 weeks from confirmation to dispatch. Larger or more intricate commissions (bridal sets, statement décor pieces) can take up to 6 weeks. We will give you a clear timeline before any work begins.'
      },
      {
        q: 'Is there a minimum order or deposit?',
        a: 'A 50% deposit is required to begin work, with the balance settled before dispatch. There is no minimum order — we craft single pieces just as carefully as larger commissions and corporate bulk orders.'
      },
      {
        q: 'Can I see progress photos?',
        a: 'Yes — we share photos at the midway point and again before final packing so you can confirm everything is exactly as you envisioned.'
      },
      {
        q: 'Do you do bridal and event commissions?',
        a: 'We love them. Tribe weddings, gifting hampers, branded corporate gifts and event décor are all available. Reach out via WhatsApp or the wholesale & gifting page to start the conversation.'
      },
    ]
  },
  {
    id: 'care',
    title: 'Care Instructions',
    icon: Heart,
    intro: 'Keep your handcrafted piece looking beautiful for years to come.',
    items: [
      {
        q: 'How do I care for my beaded jewelry?',
        a: 'Store pieces flat in a dry pouch or jewelry box, away from direct sunlight. Avoid contact with perfume, lotion and water — apply cosmetics first and let them dry before wearing your piece. Wipe gently with a soft dry cloth after wear.'
      },
      {
        q: 'Can I wear my jewelry in water?',
        a: 'We recommend removing pieces before swimming, showering or sweating heavily. Prolonged moisture can weaken the thread and dull metallic finishes over time.'
      },
      {
        q: 'How do I clean home décor and table pieces?',
        a: 'Dust gently with a soft brush or microfibre cloth. For table mats and baskets, spot-clean with a barely damp cloth — never submerge in water. Keep away from direct heat sources.'
      },
      {
        q: 'What if a bead comes loose?',
        a: 'Every Ushanga piece is hand-knotted to last, but should anything come loose within the first 6 months we will repair it for you free of charge. Just send us a photo on WhatsApp.'
      },
      {
        q: 'How should I store pieces I do not wear often?',
        a: 'Wrap each piece in soft tissue paper and store in a cool, dry place. Avoid plastic bags long-term as they can trap moisture.'
      },
    ]
  },
]

function AccordionItem({ item, open, onToggle }: { item: FaqItem; open: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-border">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 py-4 text-left hover:text-primary transition-colors"
        style={{ minHeight: '52px' }}
        aria-expanded={open}
      >
        <span className="font-medium text-foreground text-sm md:text-base">{item.q}</span>
        <ChevronDown
          className={`w-5 h-5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180 text-primary' : ''}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <p className="pb-5 pr-8 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
        </div>
      </div>
    </div>
  )
}

export default function FAQPage() {
  const [openKey, setOpenKey] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-b from-accent/40 to-background border-b border-border">
        <div className="container mx-auto px-4 py-12 md:py-16 text-center max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Help Centre</p>
          <h1 className="text-3xl md:text-5xl font-bold font-serif text-foreground mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            Answers to the questions our Tribe asks most — about shipping, custom commissions and how to care for your handcrafted piece.
          </p>
        </div>
      </section>

      {/* Quick nav */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto mb-12">
          {SECTIONS.map(section => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:border-primary hover:shadow-md transition-all"
            >
              <span className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <section.icon className="w-5 h-5" />
              </span>
              <span className="font-medium text-sm text-foreground">{section.title}</span>
            </a>
          ))}
        </div>

        {/* Sections */}
        <div className="max-w-3xl mx-auto space-y-12">
          {SECTIONS.map(section => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <section.icon className="w-5 h-5" />
                </span>
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground">{section.title}</h2>
              </div>
              <p className="text-muted-foreground text-sm mb-4 ml-12">{section.intro}</p>
              <div className="border-t border-border">
                {section.items.map((item, idx) => {
                  const key = `${section.id}-${idx}`
                  return (
                    <AccordionItem
                      key={key}
                      item={item}
                      open={openKey === key}
                      onToggle={() => setOpenKey(prev => (prev === key ? null : key))}
                    />
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Still need help CTA */}
        <div className="max-w-3xl mx-auto mt-16 mb-8 rounded-2xl bg-foreground text-background p-8 md:p-10 text-center">
          <MessageCircle className="w-10 h-10 mx-auto mb-4 text-primary" />
          <h3 className="text-2xl md:text-3xl font-serif font-bold mb-3">Still have a question?</h3>
          <p className="text-background/70 mb-6 max-w-lg mx-auto">
            Our team is one message away. We typically reply within a few hours during business days.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://wa.me/254748207000"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold text-sm uppercase tracking-wider rounded-lg hover:opacity-90 transition-opacity"
              style={{ minHeight: '48px' }}
            >
              Chat on WhatsApp
            </a>
            <Link
              to="/custom-order"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-background/30 text-background font-bold text-sm uppercase tracking-wider rounded-lg hover:bg-background/10 transition-colors"
              style={{ minHeight: '48px' }}
            >
              Start a Custom Piece
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}