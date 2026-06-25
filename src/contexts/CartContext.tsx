import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { toast } from 'sonner'

export interface CartItem {
  id: string
  name: string
  price: number
  image_url: string | null
  quantity: number
  stock: number        // ✅ added
}

interface CartContextType {
  items: CartItem[]
  addToCart: (product: {
    id: string
    name: string
    price: number
    image_url: string | null
    stock: number      // ✅ added
  }, qty?: number) => void
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

  const addToCart = useCallback((
    product: { id: string; name: string; price: number; image_url: string | null; stock: number },
    qty = 1
  ) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id)
      let newItems: CartItem[]

      if (existing) {
        const newQty = existing.quantity + qty
        if (newQty > product.stock) {           // ✅ stock check
          toast.error(`Only ${product.stock} in stock`)
          return prev
        }
        newItems = prev.map(i =>
          i.id === product.id ? { ...i, quantity: newQty } : i
        )
      } else {
        if (qty > product.stock) {              // ✅ stock check on first add
          toast.error(`Only ${product.stock} in stock`)
          return prev
        }
        newItems = [...prev, { ...product, quantity: qty }]
      }

      localStorage.setItem('ushanga-cart', JSON.stringify(newItems))
      toast.success(`${product.name} added to cart`)
      return newItems
    })
    setIsOpen(true)
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
      const item = prev.find(i => i.id === id)
      if (item && quantity > item.stock) {      // ✅ stock check
        toast.error(`Only ${item.stock} in stock`)
        return prev
      }
      const newItems = prev.map(i => i.id === id ? { ...i, quantity } : i)
      localStorage.setItem('ushanga-cart', JSON.stringify(newItems))
      return newItems
    })
  }, [removeFromCart])

  const clearCart = useCallback(() => {
    setItems([])
    localStorage.setItem('ushanga-cart', JSON.stringify([]))
  }, [])

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <CartContext.Provider value={{
      items, addToCart, removeFromCart, updateQuantity,
      clearCart, totalItems, totalPrice, isOpen, setIsOpen
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
