import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { toast } from 'sonner'

export interface CartItem {
  id: string
  name: string
  price: number
  image_url: string | null
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  addToCart: (product: { id: string; name: string; price: number; image_url: string | null }, qty?: number) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('ushanga-cart')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [isOpen, setIsOpen] = useState(false)

  const persist = (newItems: CartItem[]) => {
    setItems(newItems)
    localStorage.setItem('ushanga-cart', JSON.stringify(newItems))
  }

  const addToCart = useCallback((product: { id: string; name: string; price: number; image_url: string | null }, qty = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id)
      let newItems: CartItem[]
      if (existing) {
        newItems = prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + qty } : i)
      } else {
        newItems = [...prev, { ...product, quantity: qty }]
      }
      localStorage.setItem('ushanga-cart', JSON.stringify(newItems))
      return newItems
    })
    setIsOpen(true)
    toast.success(`${product.name} added to cart`)
  }, [])

  const removeFromCart = useCallback((id: string) => {
    setItems(prev => {
      const newItems = prev.filter(i => i.id !== id)
      localStorage.setItem('ushanga-cart', JSON.stringify(newItems))
      return newItems
    })
  }, [])

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) return removeFromCart(id)
    setItems(prev => {
      const newItems = prev.map(i => i.id === id ? { ...i, quantity } : i)
      localStorage.setItem('ushanga-cart', JSON.stringify(newItems))
      return newItems
    })
  }, [removeFromCart])

  const clearCart = useCallback(() => {
    persist([])
  }, [])

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice, isOpen, setIsOpen }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
