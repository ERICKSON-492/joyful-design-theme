import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'

export type CurrencyCode = 'KES' | 'USD' | 'EUR' | 'GBP'

export const CURRENCIES: { code: CurrencyCode; symbol: string; label: string }[] = [
  { code: 'KES', symbol: 'KSh', label: 'Kenyan Shilling' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
]

// Conservative fallback rates from 1 KES → currency. Updated live when network allows.
const FALLBACK_RATES: Record<CurrencyCode, number> = {
  KES: 1,
  USD: 0.0077,
  EUR: 0.0071,
  GBP: 0.0061,
}

const STORAGE_KEY = 'uc_currency'
const RATES_KEY = 'uc_currency_rates_v1'
const RATES_TTL = 1000 * 60 * 60 * 12 // 12h

interface Ctx {
  currency: CurrencyCode
  setCurrency: (c: CurrencyCode) => void
  rates: Record<CurrencyCode, number>
  format: (amountKes: number) => string
  symbol: string
  isLive: boolean
}

const CurrencyContext = createContext<Ctx | null>(null)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    if (typeof window === 'undefined') return 'KES'
    const stored = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null
    return stored && CURRENCIES.some(c => c.code === stored) ? stored : 'KES'
  })
  const [rates, setRates] = useState<Record<CurrencyCode, number>>(FALLBACK_RATES)
  const [isLive, setIsLive] = useState(false)

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c)
    try { localStorage.setItem(STORAGE_KEY, c) } catch {}
  }, [])

  useEffect(() => {
    let cancelled = false

    // Try cached rates first
    try {
      const raw = localStorage.getItem(RATES_KEY)
      if (raw) {
        const cached = JSON.parse(raw) as { ts: number; rates: Record<CurrencyCode, number> }
        if (cached.ts && Date.now() - cached.ts < RATES_TTL && cached.rates) {
          setRates({ ...FALLBACK_RATES, ...cached.rates, KES: 1 })
          setIsLive(true)
          return
        }
      }
    } catch {}

    fetch('https://open.er-api.com/v6/latest/KES')
      .then(r => r.json())
      .then(data => {
        if (cancelled || !data?.rates) return
        const next: Record<CurrencyCode, number> = {
          KES: 1,
          USD: Number(data.rates.USD) || FALLBACK_RATES.USD,
          EUR: Number(data.rates.EUR) || FALLBACK_RATES.EUR,
          GBP: Number(data.rates.GBP) || FALLBACK_RATES.GBP,
        }
        setRates(next)
        setIsLive(true)
        try { localStorage.setItem(RATES_KEY, JSON.stringify({ ts: Date.now(), rates: next })) } catch {}
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [])

  const symbol = CURRENCIES.find(c => c.code === currency)?.symbol || 'KSh'

  const format = useCallback((amountKes: number) => {
    const rate = rates[currency] ?? 1
    const converted = amountKes * rate
    if (currency === 'KES') {
      return `KSh ${Math.round(converted).toLocaleString()}`
    }
    // For foreign currencies show 2 decimals, with thousands separator
    const formatted = converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return `${symbol}${formatted}`
  }, [currency, rates, symbol])

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, format, symbol, isLive }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider')
  return ctx
}