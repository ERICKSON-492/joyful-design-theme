import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { CURRENCIES, useCurrency } from '@/contexts/CurrencyContext'

export function CurrencySwitcher({ compact = false }: { compact?: boolean }) {
  const { currency, setCurrency } = useCurrency()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 ${compact ? 'text-xs' : 'text-xs md:text-sm'} font-semibold hover:opacity-80 transition-opacity`}
        aria-label="Change currency"
      >
        {currency}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-background border border-border text-foreground shadow-xl rounded-md overflow-hidden z-[60]">
          {CURRENCIES.map(c => (
            <button
              key={c.code}
              onClick={() => { setCurrency(c.code); setOpen(false) }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors ${currency === c.code ? 'bg-accent/60' : ''}`}
            >
              <span>
                <span className="font-semibold">{c.code}</span>
                <span className="text-muted-foreground ml-1.5 text-xs">{c.symbol}</span>
              </span>
              {currency === c.code && <Check className="w-3.5 h-3.5 text-primary" />}
            </button>
          ))}
          <div className="px-3 py-2 text-[10px] text-muted-foreground border-t border-border bg-card">
            Charged in KSh at checkout
          </div>
        </div>
      )}
    </div>
  )
}