import { useState, useEffect, useCallback } from 'react'
import { useCart } from '@/contexts/CartContext'
import { supabase } from '@/integrations/supabase/client'
import { useCheckoutAuth } from '@/hooks/useCheckoutAuth'
import { toast } from 'sonner'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, Loader2, CheckCircle, ArrowLeft, MapPin, Minus, Plus, Trash2, ShieldCheck, Truck, CreditCard, Navigation, Search } from 'lucide-react'
import { fetchPublicTable } from '@/lib/publicContent'
import { generateAndUploadReceipt } from '@/lib/orderReceipt'
import { useSEO } from '@/hooks/useSEO'

type PaymentStatus = 'idle' | 'creating' | 'pushing' | 'polling' | 'success' | 'failed'

interface ShippingMethod {
  id: string
  name: string
  type: string
  provider: string
  estimated_days: string | null
  price: number
  regions: string[] | null
}

interface PaymentMethodOption {
  id: string
  name: string
  provider: string
  is_active: boolean
}

// All Nairobi areas with doorstep prices
const NAIROBI_AREAS: { name: string; price: number }[] = [
  { name: 'CBD', price: 150 },
  { name: 'South B', price: 350 }, { name: 'South C', price: 350 },
  { name: 'Next Gen Mall', price: 350 }, { name: 'Imara Daima', price: 350 },
  { name: 'Syokimau', price: 600 }, { name: 'Gateway Mall', price: 600 },
  { name: 'Athi River', price: 900 }, { name: 'Kitengela', price: 900 },
  { name: 'Industrial Area', price: 400 }, { name: 'Bellevue', price: 350 }, { name: 'Panari', price: 350 },
  { name: 'Greatwall Gardens', price: 300 },
  { name: 'Madaraka', price: 350 }, { name: 'Mbagathi', price: 350 },
  { name: 'Nairobi West', price: 350 }, { name: "Lang'ata", price: 350 },
  { name: 'Carnivore', price: 350 }, { name: 'Rongai', price: 800 }, { name: 'Kiserian', price: 300 },
  { name: 'Upperhill', price: 300 }, { name: 'Valley Road', price: 300 },
  { name: 'Community', price: 300 }, { name: 'Hurlingham', price: 300 },
  { name: 'KNH', price: 300 }, { name: 'Nairobi Hospital', price: 300 },
  { name: 'Kilimani', price: 350 }, { name: 'Kileleshwa', price: 350 },
  { name: 'Junction Mall', price: 400 }, { name: 'Lavington', price: 400 },
  { name: 'Kibra', price: 400 }, { name: 'Dagoretti Corner', price: 400 },
  { name: 'Kawangware', price: 400 }, { name: 'Wanyee Road', price: 400 },
  { name: 'Karen', price: 650 }, { name: 'Galleria', price: 300 },
  { name: 'Jamuhuri', price: 300 }, { name: 'Riruta', price: 300 },
  { name: 'Satellite', price: 300 }, { name: 'Ngong', price: 300 },
  { name: 'ABC', price: 350 }, { name: 'Kangemi', price: 400 },
  { name: 'Mountain View', price: 400 }, { name: 'Uthiru', price: 300 },
  { name: 'Kinoo', price: 600 }, { name: 'Kikuyu', price: 800 },
  { name: 'Westlands', price: 350 }, { name: 'Riverside', price: 350 },
  { name: 'Parklands', price: 350 }, { name: 'General Mathenge', price: 350 },
  { name: 'Aga Khan', price: 350 }, { name: 'MP Shah', price: 350 },
  { name: 'Oshwal', price: 350 }, { name: 'Spring Valley', price: 400 },
  { name: 'Ruaka', price: 450 }, { name: 'Gigiri', price: 450 },
  { name: 'Runda', price: 450 }, { name: 'Nyari', price: 450 },
  { name: 'Loresho', price: 400 }, { name: 'Lower Kabete', price: 400 },
  { name: 'Kitusuru', price: 600 }, { name: 'Village Market', price: 300 },
  { name: 'Two Rivers Mall', price: 300 }, { name: 'Mwimuto', price: 600 },
  { name: 'Kiambu Road', price: 450 }, { name: 'Thindigua', price: 450 },
  { name: 'Kiambu Town', price: 800 }, { name: 'Kirigiti', price: 300 },
  { name: 'Tatu City', price: 800 },
  { name: 'Buruburu', price: 400 }, { name: 'Donholm', price: 400 },
  { name: 'Fedha', price: 400 }, { name: 'Tassia', price: 400 },
  { name: 'Pipeline', price: 400 }, { name: 'Komarock', price: 400 },
  { name: 'Savannah', price: 400 }, { name: 'Uhuru Estate', price: 400 },
  { name: 'Nyayo Embakasi', price: 300 }, { name: 'Utawala', price: 650 },
  { name: 'Chokaa', price: 300 }, { name: 'Ruai', price: 300 }, { name: 'Kamulu', price: 900 },
  { name: 'Pangani', price: 300 }, { name: 'Ruaraka', price: 300 },
  { name: 'Lucky Summer', price: 400 }, { name: 'Mirema', price: 450 },
  { name: 'Zimmerman', price: 450 }, { name: 'Roysambu', price: 300 },
  { name: 'Kasarani', price: 300 }, { name: 'Githurai', price: 450 },
  { name: 'Kahawa West', price: 450 }, { name: 'Kahawa Wendani', price: 450 },
  { name: 'Kahawa Sukari', price: 300 }, { name: 'Clayworks', price: 450 },
  { name: 'Roasters', price: 300 }, { name: 'Marurui', price: 300 },
  { name: 'USIU', price: 300 }, { name: 'Kenyatta University', price: 300 },
  { name: 'Ruiru Bypass', price: 600 }, { name: 'Ruiru Town', price: 650 },
  { name: 'Juja', price: 220 }, { name: 'Thika Town', price: 900 },
  { name: 'Ngara', price: 300 }, { name: 'Ojijo Road', price: 300 },
]

const SUPER_METRO_AREAS: { area: string; route: string }[] = [
  { area: 'Thika Town', route: 'Super Metro - Thika' },
  { area: 'Thika', route: 'Super Metro - Thika' },
  { area: 'Juja', route: 'Super Metro - Thika' },
  { area: 'Ngong', route: 'Super Metro - Ngong' },
  { area: 'Rongai', route: 'Super Metro - Rongai' },
  { area: 'Kitengela', route: 'Super Metro - Kitengela' },
]

const SUPER_METRO_ONLY_AREAS = ['Thika Town', 'Thika', 'Juja', 'Ngong', 'Rongai', 'Kitengela']

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
  } catch { return null }
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

export default function CheckoutPage() {
  useSEO('Checkout', undefined, undefined, true)
  const { items, totalPrice, clearCart, totalItems, updateQuantity, removeFromCart } = useCart()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [error, setError] = useState('')
  const [locationSearch, setLocationSearch] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState<{ name: string; price?: number }[]>([])
  const [selectedLocation, setSelectedLocation] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('Kenya')
  const [email, setEmail] = useState('')
  const [step, setStep] = useState(0)
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([])
  const [selectedShipping, setSelectedShipping] = useState<ShippingMethod | null>(null)
  const [availableOptions, setAvailableOptions] = useState<ShippingMethod[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([])
  const [selectedPayment, setSelectedPayment] = useState<string>('mpesa')
  const [loadingGeo, setLoadingGeo] = useState(false)
  const [coordinates, setCoordinates] = useState<{ lat: number | null; lon: number | null }>({ lat: null, lon: null })
  const [buildingName, setBuildingName] = useState('')
  const [floorNumber, setFloorNumber] = useState('')
  const [houseNumber, setHouseNumber] = useState('')
  const { userId, name: accountName, email: accountEmail } = useCheckoutAuth()

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
      } catch (err) { console.error('Checkout loading error:', err) }
    }
    load()
  }, [])

  useEffect(() => {
    if (!locationSearch.trim() || locationSearch.length < 2) {
      setLocationSuggestions([])
      return
    }
    const q = locationSearch.toLowerCase()

    const nairobiMatches = NAIROBI_AREAS.filter(a => a.name.toLowerCase().includes(q))
    if (nairobiMatches.length > 0) {
      setLocationSuggestions(nairobiMatches.slice(0, 8))
      return
    }

    const regionMatches: { name: string }[] = []
    const seen = new Set<string>()
    shippingMethods.forEach(m => {
      if (!m.regions) return
      m.regions.forEach(r => {
        if (r.toLowerCase().includes(q) && !seen.has(r)) {
          seen.add(r)
          regionMatches.push({ name: r })
        }
      })
    })
    setLocationSuggestions(regionMatches.slice(0, 8))
  }, [locationSearch, shippingMethods])

  const handleSelectLocation = (loc: { name: string; price?: number }) => {
    setSelectedLocation(loc.name)
    setLocationSearch(loc.name)
    setShowSuggestions(false)
    setSelectedShipping(null)

    const isNairobiArea = NAIROBI_AREAS.some(a => a.name === loc.name)

    if (isNairobiArea && loc.price !== undefined) {
      const options: ShippingMethod[] = []

      options.push({
        id: 'pickup-shop-free',
        name: 'Pickup from Shop (Free)',
        type: 'pickup',
        provider: 'shop',
        estimated_days: 'Ready same/next business day',
        price: 0,
        regions: null,
      })

      const mtaani = shippingMethods.find(m => m.name.toLowerCase().includes('pickup mtaani'))
      if (mtaani) options.push(mtaani)

      const superMetroMatch = SUPER_METRO_AREAS.find(s =>
        s.area.toLowerCase() === loc.name.toLowerCase()
      )
      if (superMetroMatch) {
        const sm = shippingMethods.find(m => m.name === superMetroMatch.route)
        if (sm) options.push(sm)
      }

      const isSuperMetroOnly = SUPER_METRO_ONLY_AREAS.includes(loc.name)
      const doorstep = shippingMethods.find(m => m.name.toLowerCase().includes('doorstep'))
      if (doorstep && !isSuperMetroOnly) {
        options.push({ 
          ...doorstep, 
          name: 'Doorstep Delivery', // Clean name without baseline references
          price: loc.price 
        })
      }

      setAvailableOptions(options)
    } else {
      const matches = shippingMethods.filter(m =>
        m.regions?.some(r => r.toLowerCase() === loc.name.toLowerCase())
      )
      setAvailableOptions(matches)
    }
  }

  const handleDetectLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported.'); return }
    setLoadingGeo(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setCoordinates({ lat: latitude, lon: longitude })
        const geoData = await reverseGeocode(latitude, longitude)
        if (geoData) {
          const suburb = geoData.suburb || geoData.city || ''
          const matchedArea = NAIROBI_AREAS.find(a =>
            suburb.toLowerCase().includes(a.name.toLowerCase()) ||
            a.name.toLowerCase().includes(suburb.toLowerCase())
          )
          if (matchedArea) {
            setLocationSearch(matchedArea.name)
            handleSelectLocation(matchedArea)
            toast.success(`Location detected: ${matchedArea.name}`)
          } else {
            setLocationSearch(suburb)
            toast.info('Location detected. Please confirm your area from the suggestions.')
            setShowSuggestions(true)
          }
        } else {
          toast.error('Could not detect location. Please type your area.')
        }
        setLoadingGeo(false)
      },
      (err) => {
        setLoadingGeo(false)
        if (err.code === err.PERMISSION_DENIED) toast.error('Location permission denied.')
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
    const receiptUrl = await generateAndUploadReceipt({
      orderId, customerName: name, email: targetEmail, phone,
      items: items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
      subtotal, shippingLabel: selectedShipping?.name, shippingCost, grandTotal,
      shippingAddress: [houseNumber, floorNumber, buildingName, selectedLocation, postalCode, country].filter(Boolean).join(', '),
    })
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:14px;">
          <div style="font-weight:600;">${item.name}</div>
          <div style="font-size:12px;color:#6b7280;">Qty ${item.quantity} × KSh ${item.price.toLocaleString()}</div>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-weight:700;text-align:right;">KSh ${(item.price * item.quantity).toLocaleString()}</td>
      </tr>`).join('')
    const emailHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
        <div style="text-align:center;padding:14px 0;border-bottom:3px solid #D4A017;margin-bottom:18px;">
          <div style="font-size:22px;font-weight:800;letter-spacing:0.04em;">USHANGA CHRONICLES</div>
        </div>
        <h2 style="color:#D4A017;text-align:center;">Thank you for your order!</h2>
        <p>Hi ${name || 'there'}, your order <strong>#${orderId}</strong> has been received.</p>
        <table style="width:100%;border-collapse:collapse;"><tbody>${itemsHtml}</tbody></table>
        <hr style="margin:12px 0;" />
        <p style="text-align:right;font-weight:bold;">Grand Total: KSh ${grandTotal.toLocaleString()}</p>
        ${receiptUrl ? `<div style="text-align:center;margin:18px 0;"><a href="${receiptUrl}" style="background:#D4A017;color:#fff;padding:12px 22px;border-radius:8px;font-weight:700;text-decoration:none;">View Invoice Receipt</a></div>` : ''}
      </div>`
    try {
      await supabase.functions.invoke('send-email', {
        body: { to: targetEmail, subject: `Ushanga Chronicles · Order Receipt #${orderId}`, html: emailHtml }
      })
    } catch (err) { console.error('Email send error:', err) }
  }, [email, accountEmail, name, phone, grandTotal, items, selectedShipping, shippingCost, selectedLocation, postalCode, country, buildingName, floorNumber, houseNumber])

  const handleMpesaPayment = useCallback(async () => {
    if (!userId) { toast.error('Please log in first'); navigate('/auth', { state: { returnTo: '/checkout' } }); return }
    if (!phone || phone.length < 9) { setError('Please enter a valid phone number'); return }
    if (!name.trim()) { setError('Please enter your name'); return }
    if (items.length === 0) return
    const overStockItem = items.find(i => i.stock && i.quantity > i.stock)
    if (overStockItem) { setError(`"${overStockItem.name}" only has ${overStockItem.stock} in stock.`); setStep(0); return }

    setError(''); setStatus('creating')
    try {
      const orderData = {
        phone, customer_name: name, total_amount: grandTotal,
        items: items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        status: selectedPayment === 'cod' ? 'confirmed' : 'pending',
        user_id: userId, latitude: coordinates.lat, longitude: coordinates.lon,
        shipping_address: {
          location: selectedLocation, postal_code: postalCode, country,
          email, shipping_method: selectedShipping?.name, shipping_cost: shippingCost,
          building_name: buildingName || null, floor_number: floorNumber || null, house_number: houseNumber || null,
        }
      }
      const { data: order, error: orderError } = await supabase.from('orders').insert(orderData).select('id').single()
      if (orderError) throw new Error(orderError.message)

      if (selectedPayment === 'cod') {
        await sendOrderEmail(order.id); setStatus('success'); clearCart()
        toast.success('Order placed! Pay on delivery 🎉'); return
      }

      setStatus('pushing')
      const { data: responsePayload, error: stkError } = await supabase.functions.invoke(
        'mpesa-stk-push', { body: { phone, amount: grandTotal, orderId: order.id } }
      )
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
      setStatus('failed'); setError(err.message || 'Something went wrong'); toast.error('Payment failed')
    }
  }, [phone, name, items, grandTotal, userId, selectedLocation, postalCode, country, email, selectedShipping, shippingCost, selectedPayment, coordinates, buildingName, floorNumber, houseNumber, clearCart, navigate, sendOrderEmail])

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
  const isDoorstepSelected = !!selectedShipping?.name.toLowerCase().includes('doorstep')
  const canGoToPayment = name.trim() && phone.length >= 9 && selectedShipping && selectedLocation &&
    (!isDoorstepSelected || (buildingName.trim() && houseNumber.trim()))

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

            {/* STEP 0 — Cart Review */}
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
                        : <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-xs flex-shrink-0">No img</div>}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-sm truncate">{item.name}</h3>
                        <p className="text-primary font-bold text-sm mt-1">KSh {item.price.toLocaleString()}</p>
                        {item.stock && item.quantity > item.stock && (
                          <p className="text-xs text-red-500 font-semibold mt-0.5">Only {item.stock} in stock</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center border border-border rounded-lg">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1.5 hover:bg-accent transition-colors rounded-l-lg"><Minus className="w-3.5 h-3.5" /></button>
                            <span className="px-3 text-sm font-medium min-w-[2rem] text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={!!item.stock && item.quantity >= item.stock}
                              className="p-1.5 hover:bg-accent transition-colors rounded-r-lg disabled:opacity-50 disabled:cursor-not-allowed">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
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
                  <button onClick={() => setStep(1)} disabled={items.some(i => i.stock && i.quantity > i.stock)}
                    className="w-full bg-primary text-primary-foreground py-3 font-bold text-sm tracking-wider uppercase rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50" style={{ minHeight: '48px' }}>
                    Proceed to Shipping
                  </button>
                </div>
              </div>
            )}

            {/* STEP 1 — Shipping Information */}
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
                      : <><Navigation className="w-3.5 h-3.5 fill-current text-primary" /> Auto-Detect Location</>}
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
                    <select value={country} onChange={e => setCountry(e.target.value)}
                      className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 text-sm">
                      <option value="Kenya">🇰🇪 Kenya</option>
                      <option value="Tanzania">🇹🇿 Tanzania</option>
                      <option value="Uganda">🇺🇬 Uganda</option>
                      <option value="Rwanda">🇷🇼 Rwanda</option>
                      <option value="Other">🌍 Other (International)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Your Location * <span className="text-muted-foreground font-normal text-xs">(type your area, estate or town)</span>
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 z-10" />
                      <input
                        type="text"
                        value={locationSearch}
                        onChange={e => { setLocationSearch(e.target.value); setShowSuggestions(true); setSelectedLocation(''); setSelectedShipping(null); setAvailableOptions([]) }}
                        onFocus={() => locationSearch.length >= 2 && setShowSuggestions(true)}
                        placeholder="e.g. Juja, Karen, Ahero, Kisumu..."
                        className="w-full border border-border bg-background text-foreground rounded-lg pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary"
                      />
                      {showSuggestions && locationSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                          {locationSuggestions.map(loc => (
                            <button key={loc.name} type="button"
                              onClick={() => handleSelectLocation(loc)}
                              className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-accent transition-colors text-left">
                              {/* FIXED: Hides base raw price indicators inside suggestions dropdown list */}
                              <span className="text-foreground">{loc.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedLocation && (
                      <p className="text-xs text-green-600 font-semibold mt-1.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Delivering to: {selectedLocation}
                      </p>
                    )}
                  </div>

                  {/* Delivery Options Picker */}
                  {selectedLocation && (
                    <div className="pt-2 animate-fade-in">
                      <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-primary" /> Select Delivery Method *
                      </label>
                      <div className="space-y-2">
                        {availableOptions.map((option) => (
                          <div
                            key={option.id}
                            onClick={() => setSelectedShipping(option)}
                            className={`border rounded-lg p-3.5 flex items-center justify-between cursor-pointer transition-all ${
                              selectedShipping?.id === option.id
                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                : 'border-border bg-background hover:border-muted-foreground/30'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="shippingMethod"
                                checked={selectedShipping?.id === option.id}
                                onChange={() => setSelectedShipping(option)}
                                className="mt-1 accent-primary"
                              />
                              <div>
                                <p className="text-sm font-semibold text-foreground">{option.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{option.estimated_days || 'Estimated 1-3 days'}</p>
                              </div>
                            </div>
                            <p className="text-sm font-bold text-foreground">
                              {option.price === 0 ? 'Free' : `KSh ${option.price.toLocaleString()}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Extra Doorstep fields conditional checks */}
                  {isDoorstepSelected && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 animate-fade-in">
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">Building/Apartment Name *</label>
                        <input type="text" value={buildingName} onChange={e => setBuildingName(e.target.value)} placeholder="e.g. Apex Plaza"
                          className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">Floor Number</label>
                        <input type="text" value={floorNumber} onChange={e => setFloorNumber(e.target.value)} placeholder="e.g. 3rd Floor"
                          className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">House/Office No *</label>
                        <input type="text" value={houseNumber} onChange={e => setHouseNumber(e.target.value)} placeholder="e.g. House B4"
                          className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-border">
                  <button
                    onClick={() => setStep(2)}
                    disabled={!canGoToPayment}
                    className="w-full bg-primary text-primary-foreground py-3 font-bold text-sm tracking-wider uppercase rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ minHeight: '48px' }}
                  >
                    Continue to Payment
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 — Payment Processing Layout */}
            {step === 2 && (
              <div className="bg-card border border-border rounded-lg">
                <div className="p-4 border-b border-border">
                  <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" /> Select Payment Method
                  </h2>
                </div>

                <div className="p-4 space-y-4">
                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm font-medium">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        onClick={() => !isProcessing && setSelectedPayment(method.provider)}
                        className={`border rounded-lg p-4 flex flex-col justify-between cursor-pointer transition-all ${
                          selectedPayment === method.provider
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border bg-background hover:border-muted-foreground/30'
                        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-foreground">{method.name}</span>
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={selectedPayment === method.provider}
                            onChange={() => setSelectedPayment(method.provider)}
                            disabled={isProcessing}
                            className="accent-primary"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {method.provider === 'mpesa' 
                            ? 'Instant M-Pesa STK Push popup message to your mobile device phone.' 
                            : 'Pay conveniently on item arrival/pickup handling.'}
                        </p>
                      </div>
                    ))}
                  </div>

                  {selectedPayment === 'mpesa' && (
                    <div className="p-4 bg-muted/40 border border-border rounded-lg space-y-2 animate-fade-in">
                      <p className="text-xs font-semibold text-foreground">M-Pesa Checkout Requirements:</p>
                      <p className="text-xs text-muted-foreground">
                        Keep your mobile device unlocked. An STK push verification notification will prompt your Sim Pin entry to secure <strong>KSh {grandTotal.toLocaleString()}</strong> instantly.
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-border">
                  <button
                    onClick={handleMpesaPayment}
                    disabled={isProcessing || !userId}
                    className="w-full bg-primary text-primary-foreground py-3.5 font-bold text-sm tracking-wider uppercase rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ minHeight: '50px' }}
                  >
                    {status === 'creating' && <><Loader2 className="w-4 h-4 animate-spin" /> Structuring Order...</>}
                    {status === 'pushing' && <><Loader2 className="w-4 h-4 animate-spin" /> Triggering STK Push...</>}
                    {status === 'polling' && <><Loader2 className="w-4 h-4 animate-spin" /> Awaiting SIM Verification PIN...</>}
                    {status === 'idle' && (selectedPayment === 'cod' ? 'Complete Order (COD)' : 'Pay via M-Pesa Now')}
                  </button>
                  {!userId && (
                    <p className="text-xs text-center text-destructive font-semibold mt-2">
                      Please register or check authentication state to enable checkout channels.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Desktop Right Panel Summary Column */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-4 sticky top-24">
              <h2 className="font-display font-semibold text-foreground border-b border-border pb-3 mb-3">
                Order Summary
              </h2>
              <div className="space-y-2 border-b border-border pb-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal ({totalItems} items)</span>
                  <span className="font-medium text-foreground">KSh {totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span className="font-medium text-foreground">
                    {selectedShipping ? (shippingCost === 0 ? 'Free' : `KSh ${shippingCost.toLocaleString()}`) : 'Calculated next'}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-3 text-base font-bold text-foreground">
                <span>Grand Total</span>
                <span className="text-primary text-lg">KSh {grandTotal.toLocaleString()}</span>
              </div>
              
              <div className="mt-4 pt-3 border-t border-border text-[11px] text-muted-foreground space-y-1.5">
                <div className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-green-600" /> Secure SSL end-to-end processing</div>
                <div className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-primary" /> Monitored logistics partners across Kenya</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
