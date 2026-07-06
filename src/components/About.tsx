'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/integrations/supabase/client'

export function About() {
  const [activeFrame, setActiveFrame] = useState(-1)
  const [animationStarted, setAnimationStarted] = useState(false)
  
  // Dynamic states populated from your admin dashboard upload
  const [storyboardUrl, setStoryboardUrl] = useState<string | null>(null)
  const [storyboardCaption, setStoryboardCaption] = useState<string>(
    "Diverse scenarios, characters, and styles - all generated through our AI pipeline"
  )

  const processSteps = [
    {
      number: "01",
      title: "Concept & Script",
      description: "Scene‑by‑scene draft with dialogues and time‑codes",
      borderColor: "border-accent-blue"
    },
    {
      number: "02", 
      title: "Look & Storyboard",
      description: "AI engine selection and visual testing",
      borderColor: "border-accent-emerald"
    },
    {
      number: "03",
      title: "AI Production",
      description: "Motion tests and multi-variant generation",
      borderColor: "border-accent-purple"
    },
    {
      number: "04",
      title: "Post‑production",
      description: "VFX, color grading, and audio mixing",
      borderColor: "border-accent-blue"
    },
    {
      number: "05",
      title: "Master Delivery",
      description: "Multi-format export and secure transfer",
      borderColor: "border-accent-purple"
    }
  ]

  useEffect(() => {
    // 1. Load data row matching our storyboard configuration from Supabase
    const fetchStoryboardData = async () => {
      const { data } = await supabase
        .from('site_content')
        .select('image_url, body')
        .eq('section_key', 'about_storyboard')
        .maybeSingle()

      if (data?.image_url) setStoryboardUrl(data.image_url)
      if (data?.body) setStoryboardCaption(data.body)
    }

    fetchStoryboardData()

    // 2. Film Strip Animation Timeline with component unmount cleanup
    const initialTimeout = setTimeout(() => {
      setAnimationStarted(true)
      const timeouts = processSteps.map((_, index) => {
        return setTimeout(() => {
          setActiveFrame(index)
        }, index * 2000 + 1000)
      })
      return () => timeouts.forEach(clearTimeout)
    }, 3000)

    return () => clearTimeout(initialTimeout)
  }, [])

  return (
    <section id="about" className="relative py-20 bg-background overflow-hidden">
      
      {/* Cinematic Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/20 to-background" />
      
      {/* Film Grain Effect */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
        <div className="w-full h-full" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.8) 1px, transparent 0)`,
          backgroundSize: '3px 3px',
          animation: 'filmGrain 8s infinite'
        }} />
      </div>

      <div className="container mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-3 h-3 bg-accent-emerald rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-muted-foreground">
              Behind the Scenes
            </span>
            <div className="w-3 h-3 bg-accent-blue rounded-full animate-pulse" />
          </div>
          
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight mb-6 text-foreground">
            How We Create Magic
          </h2>
          
          <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            Watch our process unfold frame by frame
          </p>
        </div>

        {/* Film Strip Container */}
        <div className="relative max-w-7xl mx-auto">
          
          {/* Film Strip Background */}
          <div className="relative bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 rounded-xl overflow-hidden"
               style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.05)' }}>
            
            {/* Film Perforations - Top */}
            <div className="absolute top-0 left-0 right-0 h-6 bg-black z-20 overflow-hidden">
              <div className={`flex items-center justify-between px-12 h-full ${
                animationStarted ? 'perforations-scroll-animation' : ''
              }`} style={{ width: '200%' }}>
                {[...Array(40)].map((_, i) => (
                  <div key={`top-${i}`} className="w-4 h-3 bg-gray-800 rounded-sm border border-gray-700 flex-shrink-0" 
                       style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)' }} />
                ))}
              </div>
            </div>
            
            {/* Film Perforations - Bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-black z-20 overflow-hidden">
              <div className={`flex items-center justify-between px-12 h-full ${
                animationStarted ? 'perforations-scroll-animation' : ''
              }`} style={{ width: '200%' }}>
                {[...Array(40)].map((_, i) => (
                  <div key={`bottom-${i}`} className="w-4 h-3 bg-gray-800 rounded-sm border border-gray-700 flex-shrink-0"
                       style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)' }} />
                ))}
              </div>
            </div>

            {/* Film Frames Container */}
            <div className="relative py-6 px-8 overflow-hidden h-64 max-w-full">
              <div className={`flex transition-transform duration-1000 ease-in-out ${
                animationStarted ? 'film-scroll-animation' : ''
              }`} style={{ width: 'max-content', gap: '32px' }}>
                
                {/* START frame */}
                <div className="flex-shrink-0 w-80 h-52 bg-gray-800 rounded-lg border-2 border-gray-700 opacity-60 flex items-center justify-center" 
                     style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)' }}>
                  <div className="text-gray-400 font-mono tracking-wider">● START</div>
                </div>
                
                {/* Process Step Frames */}
                {processSteps.map((step, index) => (
                  <div
                    key={step.number}
                    className={`flex-shrink-0 w-80 h-52 bg-background rounded-lg border-4 transition-colors duration-500 ${
                      activeFrame >= index ? step.borderColor : 'border-gray-600'
                    }`}
                    style={{
                      boxShadow: '0 8px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
                    }}
                  >
                    <div className="relative h-full p-6 flex flex-col justify-between">
                      <div className="absolute -top-4 -left-4 w-12 h-12 bg-foreground text-background rounded-full flex items-center justify-center font-black z-10 border-3 border-white text-lg"
                           style={{ boxShadow: '0 6px 12px rgba(0,0,0,0.4)' }}>
                        {step.number}
                      </div>
                      
                      <div>
                        <h3 className="font-black text-xl leading-tight mb-4 text-foreground">
                          {step.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                      
                      <div className="absolute left-1 top-1 bottom-1 w-px bg-gray-300/20" />
                      <div className="absolute right-1 top-1 bottom-1 w-px bg-gray-300/20" />
                      <div className="absolute top-1 left-1 right-1 h-px bg-gray-300/20" />
                      <div className="absolute bottom-1 left-1 right-1 h-px bg-gray-300/20" />
                    </div>
                  </div>
                ))}
                
                {/* END frame */}
                <div className="flex-shrink-0 w-80 h-52 bg-gray-800 rounded-lg border-2 border-gray-700 opacity-60 flex items-center justify-center"
                     style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)' }}>
                  <div className="text-gray-400 font-mono tracking-wider">● END</div>
                </div>

                {/* Duplicate START frame for seamless looping */}
                <div className="flex-shrink-0 w-80 h-52 bg-gray-800 rounded-lg border-2 border-gray-700 opacity-60 flex items-center justify-center" 
                     style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)' }}>
                  <div className="text-gray-400 font-mono tracking-wider">● START</div>
                </div>
                
                {/* Duplicate Process Frames for loops */}
                {processSteps.map((step, index) => (
                  <div
                    key={`duplicate-${step.number}`}
                    className={`flex-shrink-0 w-80 h-52 bg-background rounded-lg border-4 transition-colors duration-500 ${
                      activeFrame >= index ? step.borderColor : 'border-gray-600'
                    }`}
                    style={{
                      boxShadow: '0 8px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
                    }}
                  >
                    <div className="relative h-full p-6 flex flex-col justify-between">
                      <div className="absolute -top-4 -left-4 w-12 h-12 bg-foreground text-background rounded-full flex items-center justify-center font-black z-10 border-3 border-white text-lg"
                           style={{ boxShadow: '0 6px 12px rgba(0,0,0,0.4)' }}>
                        {step.number}
                      </div>
                      
                      <div>
                        <h3 className="font-black text-xl leading-tight mb-4 text-foreground">
                          {step.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                      
                      <div className="absolute left-1 top-1 bottom-1 w-px bg-gray-300/20" />
                      <div className="absolute right-1 top-1 bottom-1 w-px bg-gray-300/20" />
                      <div className="absolute top-1 left-1 right-1 h-px bg-gray-300/20" />
                      <div className="absolute bottom-1 left-1 right-1 h-px bg-gray-300/20" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Projector Light Effect */}
          {activeFrame >= 0 && (
            <div className="absolute inset-0 pointer-events-none">
              <div 
                className="absolute top-1/2 left-1/2 w-48 h-48 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10"
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 20%, rgba(255,0,0,0.2) 40%, transparent 60%)',
                  animation: 'projectorLight 12s ease-in-out infinite'
                }}
              />
            </div>
          )}
        </div>

        {/* Film Controls */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-6 bg-card/80 backdrop-blur-sm clean-border rounded-2xl px-8 py-4 subtle-shadow">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-accent-emerald rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-foreground">24 FPS</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-accent-blue rounded-full animate-pulse" style={{animationDelay: '0.5s'}} />
              <span className="text-sm font-semibold text-foreground">5-7 Days</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-accent-purple rounded-full animate-pulse" style={{animationDelay: '1s'}} />
              <span className="text-sm font-semibold text-foreground">Cinema Quality</span>
            </div>
          </div>
        </div>

        {/* AI Generated Content Gallery */}
        <div className="mt-20">
          <div className="text-center mb-8">
            <p className="text-muted-foreground">
              A glimpse into our storyboard development process
            </p>
          </div>
          
          <div className="relative max-w-6xl mx-auto">
            <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-4 overflow-hidden">
              
              {/* Film grain overlay for authenticity */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                   style={{
                     backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)`,
                     backgroundSize: '4px 4px'
                   }} />
              
              {/* Dynamic Image Wrapper */}
              {storyboardUrl ? (
                <Image 
                  src={storyboardUrl}
                  alt="Collection of AI-generated video content thumbnails showcasing dynamic dashboard upload"
                  className="w-full h-auto rounded-xl"
                  width={1152}
                  height={648}
                  sizes="(max-width: 1200px) 100vw, 1152px"
                  priority
                  style={{
                    filter: 'contrast(1.05) saturate(1.1) brightness(0.95)'
                  }}
                />
              ) : (
                <div className="w-full aspect-video bg-muted/20 rounded-xl flex items-center justify-center border border-dashed border-border text-sm text-muted-foreground">
                  No active layout asset found. Complete upload inside the administrative panel.
                </div>
              )}
              
              {/* Subtle overlay gradient for depth */}
              <div className="absolute inset-4 rounded-xl pointer-events-none"
                   style={{
                     background: 'linear-gradient(135deg, rgba(37,99,235,0.03) 0%, transparent 20%, transparent 80%, rgba(124,58,237,0.03) 100%)'
                   }} />
            </div>
            
            {/* Caption text loaded dynamically from 'body' */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground italic">
                "{storyboardCaption}"
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
