import { useEffect, useState } from 'react'
import { fetchPublicTable } from '@/lib/publicContent'

export interface CardVariant {
  id: string
  variant_label: string
  size: string | null
  color: string | null
  price: number
  stock: number
}

interface Props {
  productId: string
  basePrice: number
  onVariantChange?: (v: { variant: CardVariant | null; price: number; canOrder: boolean; label: string | null; hasVariants: boolean }) => void
}

/**
 * Compact size/color picker shown directly on product cards.
 * Loads variants lazily; renders nothing if the product has none.
 */
export function ProductCardVariants({ productId, basePrice, onVariantChange }: Props) {
  const [variants, setVariants] = useState<CardVariant[]>([])
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    fetchPublicTable<CardVariant>(
      'product_variants',
      `select=id,variant_label,size,color,price,stock&product_id=eq.${productId}&is_active=eq.true&order=price.asc`
    )
      .then(data => { if (mounted) setVariants(data || []) })
      .catch(() => { if (mounted) setVariants([]) })
    return () => { mounted = false }
  }, [productId])

  const sizes = [...new Set(variants.filter(v => v.size).map(v => v.size!))]
  const colors = [...new Set(variants.filter(v => v.color).map(v => v.color!))]

  useEffect(() => {
    if (variants.length === 0) {
      onVariantChange?.({ variant: null, price: basePrice, canOrder: true, label: null, hasVariants: false })
      return
    }
    const match = variants.find(v =>
      (!selectedSize || v.size === selectedSize) &&
      (!selectedColor || v.color === selectedColor)
    ) || null

    // Only fully selected if user picked all required dimensions
    const sizeOk = sizes.length === 0 || !!selectedSize
    const colorOk = colors.length === 0 || !!selectedColor
    const fullySelected = sizeOk && colorOk && !!match

    onVariantChange?.({
      variant: fullySelected ? match : null,
      price: match?.price ?? basePrice,
      canOrder: fullySelected && (match?.stock ?? 0) > 0,
      label: match?.variant_label || null,
      hasVariants: true,
    })
  }, [selectedSize, selectedColor, variants, basePrice])

  if (variants.length === 0) return null

  return (
    <div className="space-y-2 mb-3">
      {sizes.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Size</p>
          <div className="flex flex-wrap gap-1">
            {sizes.map(size => {
              const active = selectedSize === size
              const available = variants.some(v => v.size === size && (!selectedColor || v.color === selectedColor) && v.stock > 0)
              return (
                <button
                  key={size}
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedSize(active ? null : size) }}
                  disabled={!available}
                  className={`px-2 py-1 text-[11px] font-medium border rounded transition-colors ${
                    active
                      ? 'bg-foreground text-white border-foreground'
                      : available
                        ? 'border-border hover:border-foreground'
                        : 'border-border text-muted-foreground/50 line-through cursor-not-allowed'
                  }`}
                >
                  {size}
                </button>
              )
            })}
          </div>
        </div>
      )}
      {colors.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Color</p>
          <div className="flex flex-wrap gap-1">
            {colors.map(color => {
              const active = selectedColor === color
              const available = variants.some(v => v.color === color && (!selectedSize || v.size === selectedSize) && v.stock > 0)
              return (
                <button
                  key={color}
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedColor(active ? null : color) }}
                  disabled={!available}
                  className={`px-2 py-1 text-[11px] font-medium border rounded transition-colors ${
                    active
                      ? 'bg-foreground text-white border-foreground'
                      : available
                        ? 'border-border hover:border-foreground'
                        : 'border-border text-muted-foreground/50 line-through cursor-not-allowed'
                  }`}
                >
                  {color}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}