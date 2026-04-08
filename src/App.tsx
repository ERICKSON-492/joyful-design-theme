import { TopBar } from './components/TopBar'
import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { TrustedPartners } from './components/TrustedPartners'
import { HospitalityCollections } from './components/HospitalityCollections'
import { CorporateGifting } from './components/CorporateGifting'
import { CoCreate } from './components/CoCreate'
import { Testimonials } from './components/Testimonials'
import { WhatIsMawu } from './components/WhatIsMawu'
import { Newsletter } from './components/Newsletter'
import { Footer } from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <Navbar />
      <main>
        <Hero />
        <TrustedPartners />
        <HospitalityCollections />
        <CorporateGifting />
        <CoCreate />
        <Testimonials />
        <WhatIsMawu />
        <Newsletter />
      </main>
      <Footer />
    </div>
  )
}
