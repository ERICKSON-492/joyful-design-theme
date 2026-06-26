import { useState, useEffect, useCallback, useMemo } from 'react'
import { useCart } from '@/contexts/CartContext'
import { supabase } from '@/integrations/supabase/client'
import { useCheckoutAuth } from '@/hooks/useCheckoutAuth'
import { toast } from 'sonner'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, Loader2, CheckCircle, XCircle, ArrowLeft, MapPin, Minus, Plus, Trash2, ShieldCheck, Truck, CreditCard, Navigation, Search } from 'lucide-react'
import { fetchPublicTable } from '@/lib/publicContent'
import { generateAndUploadReceipt } from '@/lib/orderReceipt'

type PaymentStatus = 'idle' | 'creating' | 'pushing' | 'polling' | 'success' | 'failed'

interface ShippingMethod {
  id: string
  name: string
  type: string
  provider: string
  estimated_days: string | null
  price: number
  regions: string[] | string | null
}

interface PaymentMethodOption {
  id: string
  name: string
  provider: string
  is_active: boolean
}

// Nairobi areas with their delivery prices from the PDF
const NAIROBI_AREAS: { area: string; price: number }[] = [
  { area: 'CBD', price: 150 },
  { area: 'Upperhill', price: 300 },
  { area: 'Valley Road', price: 300 },
  { area: 'Community', price: 300 },
  { area: 'Hurlingham', price: 300 },
  { area: 'KNH', price: 300 },
  { area: 'Nairobi Hospital', price: 300 },
  { area: 'Pangani', price: 300 },
  { area: 'Ngara', price: 300 },
  { area: 'Ojijo Road', price: 300 },
  { area: 'South B', price: 350 },
  { area: 'South C', price: 350 },
  { area: 'Next Gen Mall', price: 350 },
  { area: 'Imara Daima', price: 350 },
  { area: 'Industrial Area', price: 400 },
  { area: 'Bellevue', price: 350 },
  { area: 'Panari', price: 350 },
  { area: 'Madaraka', price: 350 },
  { area: 'Mbagathi', price: 350 },
  { area: 'Nairobi West', price: 350 },
  { area: 'Langata', price: 350 },
  { area: 'Carnivore', price: 350 },
  { area: 'Kilimani', price: 350 },
  { area: 'Kileleshwa', price: 350 },
  { area: 'Junction Mall', price: 400 },
  { area: 'Lavington', price: 400 },
  { area: 'Kibra', price: 400 },
  { area: 'Dagoretti Corner', price: 400 },
  { area: 'Kawangware', price: 400 },
  { area: 'Wanyee Road', price: 400 },
  { area: 'ABC', price: 350 },
  { area: 'Kangemi', price: 400 },
  { area: 'Mountain View', price: 400 },
  { area: 'Westlands', price: 350 },
  { area: 'Riverside', price: 350 },
  { area: 'Parklands', price: 350 },
  { area: 'General Mathenge', price: 350 },
  { area: 'Aga Khan', price: 350 },
  { area: 'MP Shah', price: 350 },
  { area: 'Oshwal', price: 350 },
  { area: 'Spring Valley', price: 400 },
  { area: 'Ruaka', price: 450 },
  { area: 'Gigiri', price: 450 },
  { area: 'Runda', price: 450 },
  { area: 'Nyari', price: 450 },
  { area: 'Loresho', price: 400 },
  { area: 'Lower Kabete', price: 400 },
  { area: 'Kitusuru', price: 600 },
  { area: 'Mwimuto', price: 600 },
  { area: 'Kiambu Road', price: 450 },
  { area: 'Thindigua', price: 450 },
  { area: 'Kiambu Town', price: 800 },
  { area: 'Tatu City', price: 800 },
  { area: 'Buruburu', price: 400 },
  { area: 'Donholm', price: 400 },
  { area: 'Fedha', price: 400 },
  { area: 'Tassia', price: 400 },
  { area: 'Pipeline', price: 400 },
  { area: 'Komarock', price: 400 },
  { area: 'Savannah', price: 400 },
  { area: 'Uhuru Estate', price: 400 },
  { area: 'Utawala', price: 650 },
  { area: 'Lucky Summer', price: 400 },
  { area: 'Mirema', price: 450 },
  { area: 'Zimmerman', price: 450 },
  { area: 'Githurai', price: 450 },
  { area: 'Kahawa West', price: 450 },
  { area: 'Kahawa Wendani', price: 450 },
  { area: 'Clayworks', price: 450 },
  { area: 'Ruiru Bypass', price: 600 },
  { area: 'Ruiru Town', price: 650 },
  { area: 'Thika Town', price: 900 },
  { area: 'Syokimau', price: 600 },
  { area: 'Gateway Mall', price: 600 },
  { area: 'Athi River', price: 900 },
  { area: 'Kitengela', price: 900 },
  { area: 'Karen', price: 650 },
  { area: 'Rongai', price: 800 },
  { area: 'Kikuyu', price: 800 },
  { area: 'Kinoo', price: 600 },
  { area: 'Kamulu', price: 900 },
]

async function reverseGeocode(lat: number, lon: number) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'Ushanga-Chronicles-App' } }
    )
    if (!response.ok) return null
    const data = await response.json()
    return {
      display_name: data.display_name,
      road: data.address?.road,
      suburb: data.address?.suburb,
      city: data.address?.city || data.address?.town || data.address?.village,
      county: data.address?.county,
    }
  } catch (error) {
    console.error('Reverse geocoding failed:', error)
    return null
  }
}

function CheckoutStepper({ step }: { step: number }) {
  const steps = ['Cart', 'Shipping', 'Payment']
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors ${
            i < step ? 'bg-green-500 text-white' : i === step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            {i < step ? '✓' : i + 1}
          </div>
          <span className={`ml-2 text-sm font-medium hidden sm:inline ${i === step ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
          {i < steps.length - 1 && <div className={`w-8 sm:w-16 h-0.5 mx-2 ${i < step ? 'bg-green-500' : 'bg-border'}`} />}
        </div>
      ))}
    </div>
  )
}

// Nairobi area searchable dropdown component
function NairobiAreaPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (area: string, price: number) => void
}) {
  const [search, setSearch] = useState(value)
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!search) return NAIROBI_AREAS
    return NAIROBI_AREAS.filter(a =>
      a.area.toLowerCase().includes(search.toLowerCase())
    )
  }, [search])

  const handleSelect = (a: { area: string; price: number }) => {
    setSearch(a.area)
    setOpen(false)
    onChange(a.area, a.price)
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search your area e.g. Karen, Westlands..."
          className="w-full border border-border bg-background text-foreground rounded-lg pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.map(a => (
            <button
              key={a.area}
              type="button"
              onClick={() => handleSelect(a)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-accent transition-colors text-left"
            >
              <span className="text-foreground">{a.area}</span>
              <span className="text-primary font-bold ml-2 shrink-0">KSh {a.price}</span>
            </button>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg px-4 py-3 text-sm text-muted-foreground">
          No matching area found. Try Pickup Mtaani instead.
        </div>
      )}
    </div>
  )
}

export default function CheckoutPage() {
  const { items, totalPrice, clearCart, totalItems, updateQuantity, removeFromCart } = useCart()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [error, setError] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [county, setCounty] = useState('')
  const [country, setCountry] = useState('Kenya')
  const [email, setEmail] = useState('')
  const [step, setStep] = useState(0)
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([])
  const [selectedShipping, setSelectedShipping] = useState<ShippingMethod | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([])
  const [selectedPayment, setSelectedPayment] = useState<string>('mpesa')
  const [loadingGeo, setLoadingGeo] = useState(false)
  const [coordinates, setCoordinates] = useState<{ lat: number | null; lon: number | null }>({ lat: null, lon: null })

  // Nairobi-specific area + doorstep price
  const [nairobiArea, setNairobiArea] = useState('')
  const [doorstepPrice, setDoorstepPrice] = useState<number | null>(null)

  const { userId, authChecked, name: accountName, email: accountEmail } = useCheckoutAuth()

  const kenyanCounties = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi', 'Kitale', 'Garissa', 'Nyeri', 'Machakos', 'Meru', 'Lamu', 'Nanyuki', 'Kajiado', 'Kiambu', 'Other']

  useEffect(() => {
    if (accountName) setName(prev => prev || accountName)
    if (accountEmail) setEmail(prev => prev || accountEmail)
  }, [accountName, accountEmail])

  useEffect(() => {
    const load = async () => {
      try {
        const [ship, pay] = await Promise.all([
          fetchPublicTable<ShippingMethod>('shipping_methods', 'select=*&is_active=eq.true&order=price.asc'),
          fetchPublicTable<PaymentMethodOption>('payment_methods', 'select=*&is_active=eq.true&order=created_at.asc'),
        ])
        setShippingMethods(ship || [])
        setPaymentMethods(pay || [])
        if (pay?.length) setSelectedPayment(pay[0].provider)
      } catch (err) {
        console.error('Checkout loading error:', err)
      }
    }
    load()
  }, [])

  const isInternational = country !== 'Kenya'
  const isNairobi = county === 'Nairobi' && !isInternational

  // Build the shipping options list
  const filteredShipping = useMemo(() => {
    const base = shippingMethods.filter(m =>
      isInternational ? m.type === 'international' : m.type === 'local'
    )
    if (isInternational || base.length === 0) return base

    // For Nairobi: show Pickup Mtaani, Super Metro, and a dynamic Doorstep option
    if (isNairobi) {
      const nairobiMethods = base.filter(m =>
        m.name.toLowerCase().includes('mtaani') ||
        m.name.toLowerCase().includes('super metro')
      )
      // Add dynamic doorstep option based on selected area
      if (doorstepPrice !== null && nairobiArea) {
        const doorstep: ShippingMethod = {
          id: 'doorstep-dynamic',
          name: `Doorstep Delivery (${nairobiArea})`,
          type: 'local',
          provider: 'Doorstep',
          estimated_days: '1 Day',
          price: doorstepPrice,
          regions: ['Nairobi'],
        }
        return [doorstep, ...nairobiMethods].sort((a, b) => a.price - b.price)
      }
      return nairobiMethods
    }

    // For upcountry: match by county/city against regions
    const userLocation = `${county || ''} ${city || ''} ${address || ''}`.trim().toLowerCase()
    if (userLocation) {
      const matches = base.filter(m => {
        let regionsArray: string[] = []
        if (Array.isArray(m.regions)) {
          regionsArray = m.regions.map(r => String(r || '').toLowerCase().trim())
        } else if (typeof m.regions === 'string') {
          regionsArray = m.regions.split(',').map(r => r.toLowerCase().trim())
        }
        return regionsArray.some(r => userLocation.includes(r) || r.includes(userLocation))
      })
      if (matches.length > 0) return matches
    }

    return base
  }, [shippingMethods, isInternational, isNairobi, county, city, address, doorstepPrice, nairobiArea])

  // Auto-select cheapest shipping when list changes
  useEffect(() => {
    if (filteredShipping.length > 0) {
      const stillValid = selectedShipping && filteredShipping.some(m => m.id === selectedShipping.id)
      if (!stillValid) {
        setSelectedShipping(filteredShipping[0])
      }
    } else {
      setSelectedShipping(null)
    }
  }, [filteredShipping])

  // Reset Nairobi area when county changes away from Nairobi
  useEffect(() => {
    if (county !== 'Nairobi') {
      setNairobiArea('')
      setDoorstepPrice(null)
    }
  }, [county])

  const handleDetectLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported.'); return }
    setLoadingGeo(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setCoordinates({ lat: latitude, lon: longitude })
        const geoData = await reverseGeocode(latitude, longitude)
        if (geoData) {
          const addressParts = [geoData.road, geoData.suburb].filter(Boolean)
          setAddress(addressParts.length > 0 ? addressParts.join(', ') : geoData.display_name)
          if (geoData.city) setCity(geoData.city)
          if (geoData.county) {
            const matched = kenyanCounties.find(c => geoData.county!.toLowerCase().includes(c.toLowerCase()))
            if (matched) setCounty(matched)
          }
          // Try to auto-match Nairobi area from suburb
          if (geoData.suburb) {
            const matchedArea = NAIROBI_AREAS.find(a =>
              geoData.suburb!.toLowerCase().includes(a.area.toLowerCase()) ||
              a.area.toLowerCase().includes(geoData.suburb!.toLowerCase())
            )
            if (matchedArea) {
              setNairobiArea(matchedArea.area)
              setDoorstepPrice(matchedArea.price)
            }
          }
          toast.success('Address filled from your location!')
        } else {
          setAddress(`GPS: (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`)
          toast.info('Coordinates set. Please adjust address manually.')
        }
        setLoadingGeo(false)
      },
      (error) => {
        setLoadingGeo(false)
        if (error.code === error.PERMISSION_DENIED) toast.error('Location permission denied.')
        else if (error.code === error.POSITION_UNAVAILABLE) toast.error('Location unavailable.')
        else if (error.code === error.TIMEOUT) toast.error('Location request timed out.')
        else toast.error('Could not detect location.')
      },
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }

  const shippingCost = selectedShipping?.price || 0
  const grandTotal = totalPrice + shippingCost

  const sendOrderEmail = useCallback(async (orderId: string) => {
    const targetEmail = email || accountEmail
    if (!targetEmail) return
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
    const shippingAddressLine = [address, nairobiArea || county || city, postalCode, country].filter(Boolean).join(', ')
    const receiptUrl = await generateAndUploadReceipt({
      orderId, customerName: name, email: targetEmail, phone,
      items: items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
      subtotal, shippingLabel: selectedShipping?.name, shippingCost, grandTotal, shippingAddress: shippingAddressLine,
    })
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:14px;">
          <div style="font-weight:600;color:#111827;">${item.name}</div>
          <div style="font-size:12px;color:#6b7280;">Qty ${item.quantity} × KSh ${item.price.toLocaleString()}</div>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-weight:700;text-align:right;">
          KSh ${(item.price * item.quantity).toLocaleString()}
        </td>
      </tr>`).join('')
    const receiptBlock = receiptUrl ? `<div style="margin:18px 0;text-align:center;"><a href="${receiptUrl}" style="display:inline-block;background-color:#D4A017;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;">View Invoice Receipt</a></div>` : ''
    const emailHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
        <div style="text-align:center;padding:14px 0;border-bottom:3px solid #D4A017;margin-bottom:18px;">
          <div style="font-size:22px;font-weight:800;color:#1A1A1A;">USHANGA CHRONICLES</div>
        </div>
        <h2 style="color:#D4A017;text-align:center;">Thank you for your order!</h2>
        <p>Hi ${name || 'there'}, your order <strong>#${orderId}</strong> has been received.</p>
        <div style="margin:20px 0;background:#fafafa;border-radius:8px;padding:16px;">
          <table style="width:100%;border-collapse:collapse;"><tbody>${itemsHtml}</tbody></table>
          <hr style="border:0;border-top:1px solid #e5e7eb;margin:12px 0;" />
          <p style="text-align:right;font-size:16px;font-weight:bold;">Grand Total: KSh ${grandTotal.toLocaleString()}</p>
        </div>
        ${receiptBlock}
      </div>`
    try {
      await supabase.functions.invoke('send-email', {
        body: { to: targetEmail, subject: `Ushanga Chronicles · Order Receipt #${orderId}`, html: emailHtml }
      })
    } catch (err) { console.error('Email send error:', err) }
  }, [email, accountEmail, name, phone, grandTotal, items, selectedShipping, shippingCost, address, nairobiArea, city, county, postalCode, country])

  const handleMpesaPayment = useCallback(async () => {
    if (!userId) { toast.error('Please log in first'); navigate('/auth', { state: { returnTo: '/checkout' } }); return }
    if (!phone || phone.length < 9) { setError('Please enter a valid phone number'); return }
    if (!name.trim()) { setError('Please enter your name'); return }
    if (items.length === 0) return
    const overStockItem = items.find(i => i.stock && i.quantity > i.stock)
    if (overStockItem) {
      setError(`"${overStockItem.name}" only has ${overStockItem.stock} in stock.`)
      setStep(0); return
    }
    setError(''); setStatus('creating')
    try {
      const orderData = {
        phone, customer_name: name, total_amount: grandTotal,
        items: items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        status: selectedPayment === 'cod' ? 'confirmed' : 'pending',
        user_id: userId, latitude: coordinates.lat, longitude: coordinates.lon,
        shipping_address: {
          address, area: nairobiArea || '', city, county, postal_code: postalCode, country, email,
          shipping_method: selectedShipping?.name, shipping_cost: shippingCost
        }
      }
      const { data: order, error: orderError } = await supabase.from('orders').insert(orderData).select('id').single()
      if (orderError) throw new Error(orderError.message)
      if (selectedPayment === 'cod') {
        await sendOrderEmail(order.id); setStatus('success'); clearCart(); toast.success('Order placed! Pay on delivery 🎉'); return
      }
      setStatus('pushing')
      const { data: responsePayload, error: stkError } = await supabase.functions.invoke('mpesa-stk-push', { body: { phone, amount: grandTotal, orderId: order.id } })
      if (stkError) throw new Error(stkError.message)
      if (!responsePayload?.success) throw new Error(responsePayload?.error || 'M-Pesa request failed.')
      const checkoutRequestId = responsePayload.mpesa_response?.CheckoutRequestID || responsePayload?.checkoutRequestId
      setStatus('polling'); let attempts = 0
      const poll = async () => {
        attempts++
        try {
          const { data: queryData } = await supabase.functions.invoke('mpesa-stk-push', { body: { action: 'query', checkout_request_id: checkoutRequestId } })
          if (queryData?.ResultCode === '0' || queryData?.ResultCode === 0) {
            await sendOrderEmail(order.id); setStatus('success'); clearCart(); toast.success('Payment successful! 🎉'); return
          }
        } catch { }
        if (attempts < 15) { setTimeout(poll, 4000) } else {
          const { data: orderCheck } = await supabase.from('orders').select('status').eq('id', order.id).single()
          if (orderCheck?.status === 'paid') { await sendOrderEmail(order.id); setStatus('success'); clearCart(); toast.success('Payment confirmed! 🎉') }
          else { setStatus('failed'); setError('Payment timed out. Contact us on WhatsApp if amount was deducted.') }
        }
      }
      setTimeout(poll, 4000)
    } catch (err: any) {
      console.error('Checkout error:', err); setStatus('failed'); setError(err.message || 'Something went wrong'); toast.error('Payment failed')
    }
  }, [phone, name, items, grandTotal, userId, address, nairobiArea, city, county, postalCode, country, email, selectedShipping, shippingCost, selectedPayment, coordinates, clearCart, navigate, sendOrderEmail])

  if (status === 'success') {
    return (
      <div className="bg-background min-h-screen pt-24 pb-16">
        <div className="container mx-auto px-4 text-center py-20 max-w-md">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h1 className="font-display text-3xl font-bold text-foreground mb-3">Order Confirmed!</h1>
          <p className="text-muted-foreground mb-8">
            {selectedPayment === 'cod' ? 'Your order has been placed. Pay on delivery.' : "Payment successful! We'll reach out via WhatsApp for delivery details."}
          </p>
          <Link to="/shop" className="inline-block bg-primary text-primary-foreground px-8 py-3 font-bold text-sm tracking-wider uppercase rounded-lg">Continue Shopping</Link>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="bg-background min-h-screen pt-24 pb-16">
        <div className="container mx-auto px-4 text-center py-20">
          <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Your cart is empty</h1>
          <Link to="/shop" className="inline-block bg-primary text-primary-foreground px-8 py-3 font-bold text-sm tracking-wider uppercase rounded-lg">Go to Shop</Link>
        </div>
      </div>
    )
  }

  const isProcessing = status === 'creating' || status === 'pushing' || status === 'polling'
  const canGoToShipping = items.length > 0
  const canGoToPayment = name.trim() && phone.length >= 9 && selectedShipping

  return (
    <div className="bg-muted/30 min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <button onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> {step > 0 ? 'Back' : 'Continue Shopping'}
        </button>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">Checkout</h1>
        <CheckoutStepper step={step} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">

            {/* Step 0 — Cart */}
            {step === 0 && (
              <div className="bg-card border border-border rounded-lg">
                <div className="p-4 border-b border-border">
                  <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-primary" /> Cart ({totalItems} items)
                  </h2>
                </div>
                <div className="divide-y divide-border">
                  {items.map(item => (
                    <div key={item.id} className="p-4 flex gap-4">
                      {item.image_url
                        ? <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-lg border border-border flex-shrink-0" />
                        : <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-xs flex-shrink-0">No img</div>
                      }
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-sm truncate">{item.name}</h3>
                        <p className="text-primary font-bold text-sm mt-1">KSh {item.price.toLocaleString()}</p>
                        {item.stock && item.quantity > item.stock && (
                          <p className="text-xs text-red-500 font-semibold mt-0.5">Only {item.stock} in stock — please reduce quantity</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center border border-border rounded-lg">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1.5 hover:bg-accent transition-colors rounded-l-lg"><Minus className="w-3.5 h-3.5" /></button>
                            <span className="px-3 text-sm font-medium min-w-[2rem] text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={!!item.stock && item.quantity >= item.stock} className="p-1.5 hover:bg-accent transition-colors rounded-r-lg disabled:opacity-50 disabled:cursor-not-allowed"><Plus className="w-3.5 h-3.5" /></button>
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="text-destructive hover:text-destructive/80 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-foreground text-sm">KSh {(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-border">
                  <button onClick={() => setStep(1)} disabled={!canGoToShipping || items.some(i => i.stock && i.quantity > i.stock)}
                    className="w-full bg-primary text-primary-foreground py-3 font-bold text-sm tracking-wider uppercase rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50" style={{ minHeight: '48px' }}>
                    Proceed to Shipping
                  </button>
                </div>
              </div>
            )}

            {/* Step 1 — Shipping */}
            {step === 1 && (
              <div className="bg-card border border-border rounded-lg">
                <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" /> Shipping Details
                  </h2>
                  <button type="button" onClick={handleDetectLocation} disabled={loadingGeo}
                    className="inline-flex items-center justify-center gap-2 text-xs font-bold bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border px-3 py-2 rounded-lg transition-colors" style={{ minHeight: '38px' }}>
                    {loadingGeo
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Detecting...</>
                      : <><Navigation className="w-3.5 h-3.5 fill-current text-primary" /> Auto-Fill My Address</>}
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Full Name *</label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Linda Amollo"
                        className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number *</label>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0748207000"
                        className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Email (optional)</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                      className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Country</label>
                    <select value={country} onChange={e => { setCounty(''); setCountry(e.target.value); setSelectedShipping(null) }}
                      className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 text-sm">
                      <option value="Kenya">🇰🇪 Kenya</option>
                      <option value="Tanzania">🇹🇿 Tanzania</option>
                      <option value="Uganda">🇺🇬 Uganda</option>
                      <option value="Rwanda">🇷🇼 Rwanda</option>
                      <option value="Other">🌍 Other (International)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {country === 'Kenya' ? (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">County</label>
                        <select value={county} onChange={e => setCounty(e.target.value)}
                          className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 text-sm">
                          <option value="">Select county</option>
                          {kenyanCounties.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">City / Town</label>
                        <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="City"
                          className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 text-sm" />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Postal Code</label>
                      <input type="text" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="00100"
                        className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 text-sm" />
                    </div>
                  </div>

                  {/* Nairobi area picker — only shown when county is Nairobi */}
                  {isNairobi && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Your Area in Nairobi <span className="text-muted-foreground">(for doorstep pricing)</span>
                      </label>
                      <NairobiAreaPicker
                        value={nairobiArea}
                        onChange={(area, price) => {
                          setNairobiArea(area)
                          setDoorstepPrice(price)
                          setAddress(area)
                        }}
                      />
                      {nairobiArea && doorstepPrice !== null && (
                        <p className="text-xs text-green-600 font-medium mt-1.5">
                          Doorstep delivery to {nairobiArea} — KSh {doorstepPrice}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Street address for non-Nairobi or additional detail */}
                  {!isNairobi && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Street Address *</label>
                      <div className="relative">
                        <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street / building / estate / landmark"
                          className="w-full border border-border bg-background text-foreground rounded-lg pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary" />
                        <MapPin className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  )}

                  {/* Delivery method */}
                  <div className="pt-2">
                    <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-primary" /> Choose Delivery Method *
                    </label>
                    {filteredShipping.length === 0 ? (
                      <div className="p-4 rounded-lg bg-muted text-center border border-dashed border-border">
                        {county ? (
                          <p className="text-xs text-muted-foreground">No delivery options available for this location yet. Please contact us.</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Select your county to see delivery options.</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredShipping.map(m => (
                          <label key={m.id}
                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedShipping?.id === m.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                            }`}>
                            <input type="radio" name="shipping" checked={selectedShipping?.id === m.id}
                              onChange={() => setSelectedShipping(m)} className="accent-primary" />
                            <div className="flex-1">
                              <p className="font-medium text-foreground text-sm">{m.name}</p>
                              <p className="text-xs text-muted-foreground">{m.estimated_days || 'Standard delivery'}{m.provider ? ` via ${m.provider}` : ''}</p>
                            </div>
                            <span className="font-bold text-foreground text-sm">KSh {m.price.toLocaleString()}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <button onClick={() => setStep(2)} disabled={!canGoToPayment}
                    className="w-full bg-primary text-primary-foreground py-3 font-bold text-sm tracking-wider uppercase rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 mt-2" style={{ minHeight: '48px' }}>
                    Proceed to Payment
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 — Payment */}
            {step === 2 && (
              <div className="bg-card border border-border rounded-lg">
                <div className="p-4 border-b border-border">
                  <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" /> Payment Options
                  </h2>
                </div>
                <div className="p-4 space-y-4">
                  {paymentMethods.length > 0 && (
                    <div className="space-y-2">
                      {paymentMethods.map(pm => (
                        <label key={pm.id}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedPayment === pm.provider ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                          }`}>
                          <input type="radio" name="payment" checked={selectedPayment === pm.provider}
                            onChange={() => setSelectedPayment(pm.provider)} className="accent-primary" />
                          <div>
                            <p className="font-medium text-foreground text-sm">{pm.name}</p>
                            {pm.provider === 'mpesa' && <p className="text-xs text-muted-foreground">Pay via M-Pesa STK Push</p>}
                            {pm.provider === 'cod' && <p className="text-xs text-muted-foreground">Pay cash when your order arrives</p>}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  {selectedPayment === 'mpesa' && (
                    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4 text-sm text-green-800 dark:text-green-200">
                      <strong>How it works:</strong> An M-Pesa prompt will be sent to <strong>{phone}</strong>. Enter your PIN to complete payment.
                    </div>
                  )}
                  {selectedPayment === 'cod' && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-200">
                      <strong>Cash on Delivery:</strong> Pay KSh {grandTotal.toLocaleString()} to the delivery agent on arrival.
                    </div>
                  )}
                  {error && (
                    <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                      <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
                    </div>
                  )}
                  <button onClick={handleMpesaPayment} disabled={isProcessing}
                    className="w-full bg-primary text-primary-foreground py-3 font-bold text-sm tracking-wider uppercase rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2" style={{ minHeight: '48px' }}>
                    {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                    {status === 'creating' && 'Creating order...'}
                    {status === 'pushing' && 'Sending M-Pesa prompt...'}
                    {status === 'polling' && 'Waiting for confirmation...'}
                    {status === 'idle' && (selectedPayment === 'cod' ? 'Place Order' : 'Complete Checkout')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-4 sticky top-24">
              <h2 className="font-display font-semibold text-foreground mb-4">Summary</h2>
              <div className="space-y-2 text-sm border-b border-border pb-3 mb-3">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground">KSh {totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span className="font-medium text-foreground">{selectedShipping ? `KSh ${shippingCost.toLocaleString()}` : 'Select shipping'}</span>
                </div>
              </div>
              <div className="flex justify-between items-baseline mb-4">
                <span className="font-semibold text-base text-foreground">Total</span>
                <span className="text-xl font-extrabold text-primary">KSh {grandTotal.toLocaleString()}</span>
              </div>
              {selectedShipping && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 mb-3">
                  📦 {selectedShipping.name} · {selectedShipping.estimated_days || 'Standard delivery'}
                </div>
              )}
              <div className="bg-muted/50 rounded-lg p-3 flex gap-2 items-start text-xs text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Your payment and personal details are kept secure throughout checkout.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
