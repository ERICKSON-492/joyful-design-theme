import { Link } from 'react-router-dom'
import { useSEO } from '@/hooks/useSEO'

export default function PrivacyPolicyPage() {
  useSEO('Privacy Policy', 'How Ushanga Chronicles collects, uses, and protects your personal information.', '/privacy-policy')
  return (
    <div className="bg-background min-h-screen pt-24 pb-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary">← Back to home</Link>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-4 mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div className="prose prose-neutral max-w-none space-y-6 text-foreground/90 leading-relaxed">
          <section>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">1. Who We Are</h2>
            <p>
              Ushanga Chronicles ("we", "us", "our") is a Kenyan brand based in Nairobi, crafting handmade African
              jewelry, home decor and accessories. This policy explains how we collect, use and protect your personal
              information when you visit <strong>ushangachronicles.com</strong> or place an order with us.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account details:</strong> name, email address, phone number.</li>
              <li><strong>Order details:</strong> shipping address, items purchased, payment confirmation reference (we never store your card or M-Pesa PIN).</li>
              <li><strong>Usage data:</strong> pages visited, device type, and anonymous analytics that help us improve the shop.</li>
              <li><strong>Communications:</strong> messages you send through our contact form, chat widget or WhatsApp.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Process and deliver your orders, including issuing receipts and tracking updates.</li>
              <li>Send transactional emails (order confirmations, shipping updates, custom-order replies).</li>
              <li>Respond to enquiries and provide customer support.</li>
              <li>Send marketing or newsletter content — only if you've opted in. You can unsubscribe at any time.</li>
              <li>Detect fraud and keep the website secure.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">4. Who We Share It With</h2>
            <p>We never sell your data. We only share it with trusted partners required to run our business:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Payment processors (Safaricom M-Pesa, Pesapal) to charge your order.</li>
              <li>Shipping providers to deliver your package.</li>
              <li>Email and hosting infrastructure used to send transactional messages and operate the site.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">5. Cookies</h2>
            <p>
              We use a small number of cookies to keep you signed in, remember your cart, and measure aggregate usage.
              You can disable cookies in your browser settings, but parts of the shop (such as checkout) may stop
              working correctly.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">6. Data Retention</h2>
            <p>
              We keep order records for as long as required by Kenyan tax and consumer-protection law. Account data is
              kept until you ask us to delete it. Marketing data is removed as soon as you unsubscribe.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">7. Your Rights</h2>
            <p>
              Under the Kenyan Data Protection Act (2019) you have the right to access, correct, export or delete the
              personal data we hold about you. To exercise any of these rights, email us at{' '}
              <a href="mailto:admin@ushangachronicles.com" className="text-primary underline">admin@ushangachronicles.com</a>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">8. Children</h2>
            <p>Our store is intended for adults. We do not knowingly collect data from anyone under 18.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">9. Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. Material changes will be announced on this page with a new
              "last updated" date.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">10. Contact Us</h2>
            <p>
              Ushanga Chronicles<br />
              Nairobi, Kenya<br />
              Email: <a href="mailto:admin@ushangachronicles.com" className="text-primary underline">admin@ushangachronicles.com</a><br />
              Phone / WhatsApp: +254 748 207 000
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
