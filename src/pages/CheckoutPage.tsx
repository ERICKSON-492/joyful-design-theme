import { useState, useEffect, useCallback, useMemo } from 'react'
import { useCart } from '@/contexts/CartContext'
import { supabase } from '@/integrations/supabase/client'
import { useCheckoutAuth } from '@/hooks/useCheckoutAuth'
import { toast } from 'sonner'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, Loader2, CheckCircle, XCircle, ArrowLeft, MapPin, Minus, Plus, Trash2, ShieldCheck, Truck, CreditCard } from 'lucide-react'
import { fetchPublicTable } from '@/lib/publicContent'
import { generateAndUploadReceipt } from '@/lib/orderReceipt'

type PaymentStatus = 'idle' | 'creating' | 'pushing' | 'polling' | 'success' | 'failed'

interface ShippingMethod {
  id: string;
  name: string;
  scope: 'nairobi_metropolis' | 'out_of_nairobi' | 'international';
  category: string;
  price: number;
  estimated_days: string | null;
  target_county: string | null;
  allowed_providers: string[] | null;
}

interface PaymentMethodOption {
  id: string;
  name: string;
  provider: string;
  is_active: boolean;
}

export default function CheckoutPage() {
  const { items, totalPrice, clearCart, totalItems, updateQuantity, removeFromCart } = useCart()
  const navigate = useNavigate()
  
  // Account & Form State
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [postalCode, setPostalCode] = useState('')
  
  // Joanna K Style Geography Tiers
  const [shippingTier, setShippingTier] = useState<'nairobi' | 'upcountry' | 'international'>('nairobi')
  const [selectedCounty, setSelectedCounty] = useState('')
  
  // Core Page state
  const [step, setStep] = useState(0)
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [error, setError] = useState('')
  
  // DB Load States
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([])
  const [selectedShipping, setSelectedShipping] = useState<ShippingMethod | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([])
  const [selectedPayment, setSelectedPayment] = useState<string>('mpesa')
  
  const { userId, name: accountName, email: accountEmail } = useCheckoutAuth()

  const kenyanCounties = [
    'Mombasa', 'Kisumu', 'Nakuru', 'Uasin Gishu (Eldoret)', 'Kiambu', 'Machakos', 
    'Kajiado', 'Nyeri', 'Meru', 'Kilifi', 'Kwaku/Diani', 'Kericho', 'Bomet', 'Kakamega', 'Bungoma', 'Busia'
  ].sort()

  useEffect(() => {
    if (accountName) setName(prev => prev || accountName)
    if (accountEmail) setEmail(prev => prev || accountEmail)
  }, [accountName, accountEmail])

  // Fetch from Database
  useEffect(() => {
    const loadData = async () => {
      try {
        const [ship, pay] = await Promise.all([
          fetchPublicTable<ShippingMethod>('shipping_methods', 'select=*&is_active=eq.true&order=price.asc'),
          fetchPublicTable<PaymentMethodOption>('payment_methods', 'select=*&is_active=eq.true&order=created_at.asc'),
        ])
        setShippingMethods(ship || [])
        setPaymentMethods(pay || [])
        if (pay?.length) setSelectedPayment(pay[0].provider)
      } catch (err) {
        console.error("Database fetch exception:", err)
      }
    }
    loadData()
  }, [])

  // ---- JOANNA K STYLE COURIER FILTER ENGINE ----
  const filteredShipping = useMemo(() => {
    if (shippingMethods.length === 0) return []

    if (shippingTier === 'international') {
      return shippingMethods.filter(m => m.scope as string === 'international' || m.category === 'International')
    }

    if (shippingTier === 'upcountry') {
      const upcountryMethods = shippingMethods.filter(m => m.scope === 'out_of_nairobi')
      if (selectedCounty) {
        // Filter specifically for that county's shuttle lines if available
        const countySpecific = upcountryMethods.filter(m => m.target_county?.toLowerCase().includes(selectedCounty.toLowerCase()))
        return countySpecific.length > 0 ? countySpecific : upcountryMethods
      }
      return upcountryMethods
    }

    // Default: Nairobi & Environs (Show local doorstep option lines, super metro, pickup mtaani)
    return shippingMethods.filter(m => m.scope === 'nairobi_metropolis')
  }, [shippingMethods, shippingTier, selectedCounty])

  // Auto-fill cheapest tier option on scope change
  useEffect(() => {
    if (filteredShipping.length > 0) {
      setSelectedShipping(filteredShipping[0])
    } else {
      setSelectedShipping(null)
    }
  }, [filteredShipping])

  const shippingCost = selectedShipping?.price || 0
  const grandTotal = totalPrice + shippingCost

  // Email Notification Execution Block
  const sendOrderEmail = useCallback(async (orderId: string) => {
    const targetEmail = email || accountEmail
    if (!targetEmail) return

    const shippingAddressLine = `${address}, Delivery Tier: ${shippingTier.toUpperCase()} ${selectedCounty ? `(${selectedCounty})` : ''}`
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding:10px; border-bottom:1px solid #eee;">
          <strong>${item.name}</strong> x ${item.quantity}
        </td>
        <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">
          KSh ${(item.price * item.quantity).toLocaleString()}
        </td>
      </tr>
    `).join('')

    const emailHtml = `
      <div style="font-family:sans-serif; max-width:600px; margin:0 auto; padding:20px; border:1px solid #eee;">
        <h2 style="color:#111; text-align:center;">JOANNA K COSMETICS STYLE CHECKOUT</h2>
        <p>Thank you for shopping with us! Your order <strong>#${orderId}</strong> has been received.</p>
        <table style="width:100%; border-collapse:collapse; margin:20px 0;">
          <tbody>${itemsHtml}</tbody>
        </table>
        <p style="text-align:right; font-size:16px; font-weight:bold;">Total: KSh ${grandTotal.toLocaleString()}</p>
        <p style="font-size:12px; color:#666;">Delivery Point: ${shippingAddressLine}</p>
      </div>
    `

    try {
      await supabase.functions.invoke('send-email', {
        body: { to: targetEmail, subject: `Order Received · #${orderId}`, html: emailHtml }
      })
    } catch (err) {
      console.error("Email delivery fail:", err)
    }
  }, [email, accountEmail, items, grandTotal, address, shippingTier, selectedCounty])

  // Payment Execution Pipeline
  const handleCheckoutSubmission = useCallback(async () => {
    if (!userId) {
      toast.error('Please login to complete your checkout')
      return
    }
    if (!name || phone.length < 9 || !address) {
      setError('Please fill out all required shipping fields.')
      return
    }

    setError('')
    setStatus('creating')

    try {
      const orderData = {
        phone,
        customer_name: name,
        total_amount: grandTotal,
        items: items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        status: selectedPayment === 'cod' ? 'confirmed' : 'pending',
        user_id: userId,
        shipping_address: {
          address,
          postal_code: postalCode,
          tier: shippingTier,
          county: selectedCounty || 'Nairobi',
          shipping_method: selectedShipping?.name,
          shipping_cost: shippingCost,
          email
        }
      }
      // pages/Checkout.tsx or app/checkout/page.tsx

const handlePlaceOrder = async () => {
  // First validate stock
  const validateResponse = await fetch('/api/checkout/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  });

  const validation = await validateResponse.json();

  if (!validation.success) {
    toast.error(validation.error);
    return;
  }

  // If validation passes, proceed with order
  // ... rest of your order placement logic
};

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select('id')
        .single()

      if (orderError) throw new Error(orderError.message)

      if (selectedPayment === 'cod') {
        await sendOrderEmail(order.id)
        setStatus('success'); clearCart(); return
      }

      setStatus('pushing')
      const { data: payRes, error: stkError } = await supabase.functions.invoke('mpesa-stk-push', {
        body: { phone, amount: grandTotal, orderId: order.id }
      })

      if (stkError || !payRes?.success) throw new Error(payRes?.error || 'Safaricom connection drop.')

      setStatus('polling')
      let attempts = 0
      const poll = async () => {
        attempts++
        try {
          const { data: qData } = await supabase.functions.invoke('mpesa-stk-push', {
            body: { action: 'query', checkout_request_id: payRes.mpesa_response?.CheckoutRequestID || payRes.checkoutRequestId }
          })
          if (qData?.ResultCode === 0 || qData?.ResultCode === '0') {
            await sendOrderEmail(order.id)
            setStatus('success'); clearCart(); return
          }
        } catch {}

        if (attempts < 12) setTimeout(poll, 4000)
        else {
          setStatus('failed')
          setError('Handset validation timeout. Please connect with support if deducted.')
        }
      }
      setTimeout(poll, 4000)
    } catch (err: any) {
      setStatus('failed')
      setError(err.message || 'An error occurred during transaction processing.')
    }
  }, [phone, name, items, grandTotal, userId, address, postalCode, shippingTier, selectedCounty, selectedShipping, shippingCost, selectedPayment, email, clearCart, sendOrderEmail])

  if (status === 'success') {
    return (
      <div className="bg-background min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-card border border-border rounded-xl">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-muted-foreground mb-6">Thank you for your purchase. We are processing your package right now.</p>
          <Link to="/shop" className="bg-black text-white px-6 py-2.5 rounded-lg text-sm font-medium tracking-wide">Continue Shopping</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#fafafa] dark:bg-background min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Main Form Fields */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white dark:bg-card p-6 border border-border rounded-xl shadow-sm">
              
              {/* Stepper Tabs */}
              <div className="flex gap-4 border-b border-border pb-4 mb-6 text-sm">
                <button onClick={() => setStep(0)} className={`font-semibold pb-2 ${step === 0 ? 'text-black border-b-2 border-black' : 'text-muted-foreground'}`}>1. Bag Summary</button>
                <button onClick={() => setStep(1)} className={`font-semibold pb-2 ${step === 1 ? 'text-black border-b-2 border-black' : 'text-muted-foreground'}`}>2. Delivery Method</button>
                <button onClick={() => setStep(2)} className={`font-semibold pb-2 ${step === 2 ? 'text-black border-b-2 border-black' : 'text-muted-foreground'}`}>3. Settle Payment</button>
              </div>

              {step === 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold tracking-tight">Review Your Selection</h2>
                  <div className="divide-y divide-border">
                    {items.map(item => (
                      <div key={item.id} className="py-3 flex gap-4 items-center">
                        <img src={item.image_url || '/placeholder.png'} className="w-14 h-14 object-cover rounded-lg bg-muted" />
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-foreground">{item.name}</h4>
                          <p className="text-xs text-muted-foreground">KSh {item.price.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center border border-border rounded-md bg-muted/20">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1"><Minus className="w-3 h-3" /></button>
                          <span className="px-2 text-xs font-semibold">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1"><Plus className="w-3 h-3" /></button>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setStep(1)} className="w-full bg-black text-white text-xs font-bold py-3 rounded-lg uppercase tracking-wider mt-4">Proceed to Delivery</button>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold tracking-tight">Delivery Address</h2>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Full Name *</label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-border p-2.5 rounded-lg text-sm bg-background" placeholder="Amani Kenya" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Phone Number *</label>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-border p-2.5 rounded-lg text-sm bg-background" placeholder="0712345678" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Email Address</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-border p-2.5 rounded-lg text-sm bg-background" placeholder="amani@domain.com" />
                  </div>

                  {/* Joanna K Cosmetics explicit shipping tier selectors */}
                  <div>
                    <label className="block text-xs font-semibold uppercase text-muted-foreground mb-2">Shipping Region *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['nairobi', 'upcountry', 'international'] as const).map(tier => (
                        <button key={tier} type="button" onClick={() => { setShippingTier(tier); setSelectedCounty(''); }}
                          className={`p-3 border rounded-xl text-xs font-bold capitalize transition-all ${shippingTier === tier ? 'border-black bg-black text-white' : 'border-border bg-background hover:bg-muted/30'}`}>
                          {tier === 'nairobi' ? 'Nairobi & Environs' : tier === 'upcountry' ? 'Upcountry Kenya' : 'International'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {shippingTier === 'upcountry' && (
                    <div>
                      <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Destination County *</label>
                      <select value={selectedCounty} onChange={e => setSelectedCounty(e.target.value)} className="w-full border border-border p-2.5 rounded-lg text-sm bg-background">
                        <option value="">Select upcountry county drop...</option>
                        {kenyanCounties.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Street Address / Landmark Details *</label>
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full border border-border p-2.5 rounded-lg text-sm bg-background" placeholder="Apartment, suite, block, estate name, or road markers" />
                  </div>

                  {/* Dynamic Option List matching selection parameters */}
                  <div className="pt-2">
                    <label className="block text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" /> Available Delivery Tiers
                    </label>
                    <div className="space-y-2">
                      {filteredShipping.map(method => (
                        <label key={method.id} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${selectedShipping?.id === method.id ? 'border-black bg-muted/20' : 'border-border hover:border-black/40'}`}>
                          <input type="radio" name="shipping" checked={selectedShipping?.id === method.id} onChange={() => setSelectedShipping(method)} className="accent-black" />
                          <div className="flex-1 text-sm">
                            <p className="font-semibold">{method.name}</p>
                            <p className="text-xs text-muted-foreground">{method.estimated_days || 'Standard transit timelines'} {method.allowed_providers ? `via ${method.allowed_providers.join(', ')}` : ''}</p>
                          </div>
                          <span className="font-bold text-sm">KSh {method.price.toLocaleString()}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => setStep(2)} className="w-full bg-black text-white text-xs font-bold py-3 rounded-lg uppercase tracking-wider mt-2">Continue To Payment</button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold tracking-tight">Settle Payment</h2>
                  
                  <div className="space-y-2">
                    {paymentMethods.map(pm => (
                      <label key={pm.id} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer ${selectedPayment === pm.provider ? 'border-black bg-muted/10' : 'border-border'}`}>
                        <input type="radio" name="payment" checked={selectedPayment === pm.provider} onChange={() => setSelectedPayment(pm.provider)} className="accent-black" />
                        <div className="text-sm">
                          <p className="font-semibold">{pm.name}</p>
                          <p className="text-xs text-muted-foreground">{pm.provider === 'mpesa' ? 'Instant STK prompt direct to your phone' : 'Pay when parcel physically arrives'}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {error && <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg flex items-center gap-2"><XCircle className="w-4 h-4" /> {error}</div>}

                  <button onClick={handleCheckoutSubmission} disabled={status !== 'idle'} className="w-full bg-black text-white text-xs font-bold py-3 rounded-lg uppercase tracking-wider flex items-center justify-center gap-2">
                    {status !== 'idle' && <Loader2 className="w-4 h-4 animate-spin" />}
                    {status === 'idle' && (selectedPayment === 'cod' ? 'Place Order' : 'Complete Checkout')}
                    {status === 'creating' && 'Processing Invoice...'}
                    {status === 'pushing' && 'Sending Secure STK Push...'}
                    {status === 'polling' && 'Awaiting Handset PIN Input...'}
                  </button>
                </div>
              )}

            </div>
          </div>

          {/* Sidebar Order Summary Sticky panel */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-card p-6 border border-border rounded-xl shadow-sm sticky top-24 space-y-4">
              <h3 className="text-md font-bold tracking-tight border-b border-border pb-2">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Items Subtotal</span><span className="font-semibold text-foreground">KSh {totalPrice.toLocaleString()}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Shipping Fees</span><span className="font-semibold text-foreground">{selectedShipping ? `KSh ${shippingCost.toLocaleString()}` : 'Select in next step'}</span></div>
                <div className="border-t border-border pt-3 flex justify-between items-baseline">
                  <span className="font-bold text-base">Total Amount</span>
                  <span className="text-xl font-black text-black dark:text-white">KSh {grandTotal.toLocaleString()}</span>
                </div>
              </div>
              <div className="bg-muted/40 p-3 rounded-xl flex gap-2 items-start text-[11px] text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-black dark:text-white shrink-0" />
                <span>Secure Checkout. Your transaction parameters are fully encrypted and protected against intercepted interference patterns.</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
