import { useEffect, useState, useCallback } from 'react'

const STORAGE_KEY = 'ushanga_recently_viewed'
const MAX_ITEMS = 8

export function useRecentlyViewed() {
  const [ids, setIds] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setIds(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  const addProduct = useCallback((productId: string) => {
    setIds(prev => {
      const filtered = prev.filter(id => id !== productId)
      const next = [productId, ...filtered].slice(0, MAX_ITEMS)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  return { ids, addProduct }
}
