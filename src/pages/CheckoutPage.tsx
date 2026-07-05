import { useState, useEffect, useCallback, useMemo } from 'react'
import { useCart } from '@/contexts/CartContext'
import { supabase } from '@/integrations/supabase/client'
import { useCheckoutAuth } from '@/hooks/useCheckoutAuth'
import { toast } from 'sonner'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, Loader2, CheckCircle, XCircle, ArrowLeft, MapPin, Minus, Plus, Trash2, ShieldCheck, Truck, CreditCard, Navigation, Search } from 'lucide-react'
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

// Super Metro specific area mapping
const SUPER_METRO_AREAS: { area: string; route: string }[] = [
  { area: 'Thika Town', route: 'Super Metro - Thika' },
  { area: 'Thika', route: 'Super Metro - Thika' },
  { area: 'Juja', route: 'Super Metro - Thika' },
  { area: 'Ngong', route: 'Super Metro - Ngong' },
  { area: 'Rongai', route: 'Super Metro - Rongai' },
  { area: 'Kitengela', route: 'Super Metro - Kitengela' },
]

// These areas are served by Super Metro + Pickup Mtaani only (no doorstep)
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
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discount_type: string; discount_value: number } | null>(null)
  const [couponMessage, setCouponMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [checkingCoupon, setCheckingCoupon] = useState(false)
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

  // Build location suggestions as user types
  useEffect(() => {
    if (!locationSearch.trim() || locationSearch.length < 2) {
      setLocationSuggestions([])
      return
    }
    const q = locationSearch.toLowerCase()

    // Check Nairobi areas first
    const nairobiMatches = NAIROBI_AREAS.filter(a => a.name.toLowerCase().includes(q))
    if (nairobiMatches.length > 0) {
      setLocationSuggestions(nairobiMatches.slice(0, 8))
      return
    }

    // Check upcountry regions from DB
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

  // When a location is selected, compute available delivery options
  const handleSelectLocation = (loc: { name: string; price?: number }) => {
    setSelectedLocation(loc.name)
    setLocationSearch(loc.name)
    setShowSuggestions(false)
    setSelectedShipping(null)

    const isNairobiArea = NAIROBI_AREAS.some(a => a.name === loc.name)

    if (isNairobiArea && loc.price !== undefined) {
      const options: ShippingMethod[] = []

      // Pickup from Shop is always free and available for any Nairobi-area order
      options.push({
        id: 'pickup-shop-free',
        name: 'Pickup from Shop (Free)',
        type: 'pickup',
        provider: 'shop',
        estimated_days: 'Ready same/next business day',
        price: 0,
        regions: null,
      })

      // Always add Pickup Mtaani
      const mtaani = shippingMethods.find(m => m.name.toLowerCase().includes('pickup mtaani'))
      if (mtaani) options.push(mtaani)

      // Add only the specific Super Metro route for this area (exact match)
      const superMetroMatch = SUPER_METRO_AREAS.find(s =>
        s.area.toLowerCase() === loc.name.toLowerCase()
      )
      if (superMetroMatch) {
        const sm = shippingMethods.find(m => m.name === superMetroMatch.route)
        if (sm) options.push(sm)
      }

      // Add Doorstep with area-specific price (only if not a Super Metro-only area)
      const isSuperMetroOnly = SUPER_METRO_ONLY_AREAS.includes(loc.name)
      const doorstep = shippingMethods.find(m => m.name.toLowerCase().includes('doorstep'))
      if (doorstep && !isSuperMetroOnly) {
        options.push({ ...doorstep, price: loc.price })
      }

      setAvailableOptions(options)
    } else {
      // Upcountry: find all methods whose regions include this location
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
          // Try to match to a Nairobi area
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
  const discountAmount = appliedCoupon
    ? Math.min(
        appliedCoupon.discount_type === 'percentage'
          ? totalPrice * (appliedCoupon.discount_value / 100)
          : appliedCoupon.discount_value,
        totalPrice
      )
    : 0
  const grandTotal = Math.round(Math.max(totalPrice - discountAmount, 0) + shippingCost)

  const applyCoupon = useCallback(async () => {
    if (!couponCode.trim()) return
    setCheckingCoupon(true)
    setCouponMessage(null)
    try {
      const { data, error } = await supabase.rpc('validate_coupon', {
        p_code: couponCode.trim(),
        p_order_amount: totalPrice,
      })
      const result = Array.isArray(data) ? data[0] : data
      if (error || !result?.valid) {
        setAppliedCoupon(null)
        setCouponMessage({ text: result?.message || error?.message || 'Invalid coupon code', ok: false })
        return
      }
      setAppliedCoupon({
        id: result.coupon_id,
        code: couponCode.trim().toUpperCase(),
        discount_type: result.discount_type,
        discount_value: result.discount_value,
      })
      setCouponMessage({ text: result.message || 'Coupon applied!', ok: true })
    } catch {
      setCouponMessage({ text: 'Could not validate coupon. Try again.', ok: false })
    } finally {
      setCheckingCoupon(false)
    }
  }, [couponCode, totalPrice])

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode('')
    setCouponMessage(null)
  }

  const sendOrderEmail = useCallback(async (orderId: string) => {
    const targetEmail = email || accountEmail
    if (!targetEmail) return
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
    const receiptUrl = await generateAndUploadReceipt({
      orderId, customerName: name, email: targetEmail, phone,
      items: items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
      subtotal, shippingLabel: selectedShipping?.name, shippingCost, grandTotal,
      shippingAddress: [houseNumber, floorNumber, buildingName, selectedLocation, postalCode, country].filter(Boolean).join(', '),
      couponCode: appliedCoupon?.code, discountAmount,
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
        ${discountAmount > 0 ? `<p style="text-align:right;color:#16a34a;">Discount${appliedCoupon ? ` (${appliedCoupon.code})` : ''}: - KSh ${discountAmount.toLocaleString()}</p>` : ''}
        <p style="text-align:right;font-weight:bold;">Grand Total: KSh ${grandTotal.toLocaleString()}</p>
        ${receiptUrl ? `<div style="text-align:center;margin:18px 0;"><a href="${receiptUrl}" style="background:#D4A017;color:#fff;padding:12px 22px;border-radius:8px;font-weight:700;text-decoration:none;">View Invoice Receipt</a></div>` : ''}
      </div>`
    try {
      await supabase.functions.invoke('send-email', {
        body: { to: targetEmail, subject: `Ushanga Chronicles · Order Receipt #${orderId}`, html: emailHtml }
      })
    } catch (err) { console.error('Email send error:', err) }
  }, [email, accountEmail, name, phone, grandTotal, items, selectedShipping, shippingCost, selectedLocation, postalCode, country, buildingName, floorNumber, houseNumber, appliedCoupon, discountAmount])

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
          coupon_code: appliedCoupon?.code || null, discount_amount: discountAmount || null,
        }
      }
      const { data: order, error: orderError } = await supabase.from('orders').insert(orderData).select('id').single()
      if (orderError) throw new Error(orderError.message)

      // A coupon (or free pickup + full discount) can bring the total to
      // zero — M-Pesa can't process a KSh 0 charge, so treat it like a
      // completed free order instead of attempting STK push.
      if (selectedPayment === 'cod' || grandTotal <= 0) {
        if (grandTotal <= 0 && selectedPayment !== 'cod') {
          await supabase.from('orders').update({ status: 'confirmed' }).eq('id', order.id)
        }
        if (appliedCoupon) supabase.rpc('redeem_coupon', { p_coupon_id: appliedCoupon.id }).then(() => {})
        await sendOrderEmail(order.id); setStatus('success'); clearCart()
        toast.success(grandTotal <= 0 ? 'Order placed — nothing to pay! 🎉' : 'Order placed! Pay on delivery 🎉')
        return
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
            if (appliedCoupon) supabase.rpc('redeem_coupon', { p_coupon_id: appliedCoupon.id }).then(() => {})
            await sendOrderEmail(order.id); setStatus('success'); clearCart(); toast.success('Payment successful! 🎉'); return
          }
        } catch { }
        if (attempts < 15) { setTimeout(poll, 4000) } else {
          const { data: orderCheck } = await supabase.from('orders').select('status').eq('id', order.id).single()
          if (orderCheck?.status === 'paid') {
            if (appliedCoupon) supabase.rpc('redeem_coupon', { p_coupon_id: appliedCoupon.id }).then(() => {})
            await sendOrderEmail(order.id); setStatus('success'); clearCart(); toast.success('Payment confirmed! 🎉')
          }
          else { setStatus('failed'); setError('Payment timed out. Contact us on WhatsApp if amount was deducted.') }
        }
      }
      setTimeout(poll, 4000)
    } catch (err: any) {
      setStatus('failed'); setError(err.message || 'Something went wrong'); toast.error('Payment failed')
    }
  }, [phone, name, items, grandTotal, userId, selectedLocation, postalCode, country, email, selectedShipping, shippingCost, selectedPayment, coordinates, buildingName, floorNumber, houseNumber, appliedCoupon, discountAmount, clearCart, navigate, sendOrderEmail])

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

            {/* STEP 0 — Cart */}
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

            {/* STEP 1 — Shipping */}
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
                  {/* Name & Phone */}
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

                  {/* Location Search */}
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
                              <span className="text-foreground">{loc.name}</span>
                              {loc.price !== undefined && (
                                <span className="text-xs text-muted-foreground">Doorstep from KSh {loc.price}</span>
                              )}
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

                  {/* Delivery Options — only shown after location selected */}
                  {selectedLocation && (
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-primary" /> Available Delivery Options
                      </label>

                      {availableOptions.length === 0 ? (
                        <div className="p-4 rounded-lg bg-muted text-center border border-dashed border-border">
                          <p className="text-xs text-muted-foreground">No delivery options found for this location. Contact us on WhatsApp.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {availableOptions.map((m, idx) => (
                            <label key={`${m.id}-${idx}`}
                              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedShipping?.id === m.id && selectedShipping?.price === m.price
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}>
                              <input type="radio" name="shipping"
                                checked={selectedShipping?.id === m.id && selectedShipping?.price === m.price}
                                onChange={() => setSelectedShipping(m)} className="accent-primary" />
                              <div className="flex-1">
                                <p className="font-medium text-foreground text-sm">{m.name}</p>
                                <p className="text-xs text-muted-foreground">{m.estimated_days || 'Standard delivery'}</p>
                              </div>
                              <span className="font-bold text-primary text-sm">{m.price > 0 ? `KSh ${m.price.toLocaleString()}` : 'Free'}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Building / floor / house number — only needed for door-to-door (Doorstep) delivery */}
                  {selectedShipping?.name.toLowerCase().includes('doorstep') && (
                    <div className="space-y-3 p-3 rounded-lg bg-muted/40 border border-border">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-primary" /> Door-to-door details — helps our rider find you
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">Building / Estate Name *</label>
                          <input type="text" value={buildingName} onChange={e => setBuildingName(e.target.value)} placeholder="e.g. Jamuhuri Heights"
                            className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">Floor No.</label>
                          <input type="text" value={floorNumber} onChange={e => setFloorNumber(e.target.value)} placeholder="e.g. 3rd Floor"
                            className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">House / Door No. *</label>
                          <input type="text" value={houseNumber} onChange={e => setHouseNumber(e.target.value)} placeholder="e.g. B14"
                            className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Info note for shop pickup */}
                  {selectedShipping?.id === 'pickup-shop-free' && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-200 flex gap-2 items-start">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>Free — collect your order from our shop. We'll send you the pickup address and let you know when it's ready via WhatsApp/SMS.</span>
                    </div>
                  )}

                  <button onClick={() => setStep(2)} disabled={!canGoToPayment}
                    className="w-full bg-primary text-primary-foreground py-3 font-bold text-sm tracking-wider uppercase rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 mt-2" style={{ minHeight: '48px' }}>
                    Proceed to Payment
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 — Payment */}
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
                  <span className="font-medium text-foreground">{selectedShipping ? `KSh ${shippingCost.toLocaleString()}` : '—'}</span>
                </div>
                {selectedLocation && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Location</span>
                    <span className="font-medium text-foreground text-xs">{selectedLocation}</span>
                  </div>
                )}
                {selectedShipping && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Via</span>
                    <span className="font-medium text-foreground text-xs">{selectedShipping.name}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount {appliedCoupon && `(${appliedCoupon.code})`}</span>
                    <span className="font-medium">- KSh {discountAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Coupon code */}
              <div className="mb-4">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg px-3 py-2 text-sm">
                    <span className="text-green-700 dark:text-green-300 font-medium">
                      "{appliedCoupon.code}" applied
                    </span>
                    <button onClick={removeCoupon} className="text-xs text-muted-foreground hover:text-destructive underline">
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                        placeholder="Coupon code"
                        className="flex-1 border border-border bg-background rounded-lg px-3 py-2 text-sm uppercase"
                      />
                      <button
                        onClick={applyCoupon}
                        disabled={checkingCoupon || !couponCode.trim()}
                        className="bg-foreground text-background px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide disabled:opacity-50 shrink-0"
                      >
                        {checkingCoupon ? '...' : 'Apply'}
                      </button>
                    </div>
                    {couponMessage && (
                      <p className={`text-xs mt-1.5 ${couponMessage.ok ? 'text-green-600' : 'text-destructive'}`}>
                        {couponMessage.text}
                      </p>
                    )}
                  </>
                )}
              </div>
              <div className="flex justify-between items-baseline mb-4">
                <span className="font-semibold text-base text-foreground">Total</span>
                <span className="text-xl font-extrabold text-primary">KSh {grandTotal.toLocaleString()}</span>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 flex gap-2 items-start text-xs text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Your payment and personal details are kept secure.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
