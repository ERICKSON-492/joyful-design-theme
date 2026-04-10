import { useState, useEffect, useCallback } from 'react'
import { useCart } from '@/contexts/CartContext'
import { supabase } from '@/integrations/supabase/client'
import { useCheckoutAuth } from '@/hooks/useCheckoutAuth'
import { toast } from 'sonner'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, Phone, Loader2, CheckCircle, XCircle, ArrowLeft, MapPin, Minus, Plus, Trash2, ShieldCheck } from 'lucide-react'

type PaymentStatus = 'idle' | 'creating' | 'pushing' | 'polling' | 'success' | 'failed'

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
  const { items, totalPrice, clearCart, totalItems, updateQuantity, removeFromCart } = useCart()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [error, setError] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [email, setEmail] = useState('')
  const [step, setStep] = useState(0)
  const { userId, authChecked, name: accountName, email: accountEmail } = useCheckoutAuth()

  useEffect(() => {
    if (accountName) setName(prev => prev || accountName)
    if (accountEmail) setEmail(prev => prev || accountEmail)
  }, [accountName, accountEmail])

  const handleMpesaPayment = useCallback(async () => {
    if (!userId) {
      toast.error('Please log in first')
      navigate('/auth', { state: { returnTo: '/checkout' } })
      return
    }
    if (!phone || phone.length < 9) { setError('Please enter a valid M-Pesa phone number'); return }
    if (!name.trim()) { setError('Please enter your name'); return }
    if (items.length === 0) return

    setError('')
    setStatus('creating')

    try {
      const orderItems = items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity }))

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          phone, customer_name: name, total_amount: totalPrice,
          items: orderItems as any, status: 'pending', user_id: userId,
          shipping_address: { address, city, postal_code: postalCode, email },
        })
        .select('id').single()

      if (orderError || !order) throw new Error('Failed to create order')

      setStatus('pushing')
      const { data: stkData, error: stkError } = await supabase.functions.invoke(
        'mpesa-stk-push', { body: { phone, amount: totalPrice, order_id: order.id } }
      )
      if (stkError) throw new Error(stkError.message)
      if (stkData?.ResponseCode !== '0') throw new Error(stkData?.ResponseDescription || 'Failed to initiate M-Pesa payment')

      setStatus('polling')
      const checkoutRequestId = stkData.CheckoutRequestID
      let attempts = 0

      const poll = async () => {
        attempts++
        try {
          const { data: queryData } = await supabase.functions.invoke(
            'mpesa-stk-push?action=query', { body: { checkout_request_id: checkoutRequestId } }
          )
          if (queryData?.ResultCode === '0' || queryData?.ResultCode === 0) {
            setStatus('success'); clearCart(); toast.success('Payment successful! Asante sana 🎉'); return
          }
          if (queryData?.ResultCode && queryData.ResultCode !== '0') {
            if (queryData.errorCode === '500.001.1001' || queryData.ResultCode === '1032') {
              setStatus('failed'); setError('Payment was cancelled. Please try again.'); return
            }
          }
        } catch { /* ignore */ }

        if (attempts < 15) {
          setTimeout(poll, 4000)
        } else {
          const { data: orderCheck } = await supabase.from('orders').select('status').eq('id', order.id).single()
          if (orderCheck?.status === 'paid') { setStatus('success'); clearCart(); toast.success('Payment successful! 🎉') }
          else { setStatus('failed'); setError('Payment timed out. If money was deducted, contact us on WhatsApp.') }
        }
      }
      setTimeout(poll, 4000)
    } catch (err: any) {
      setStatus('failed'); setError(err.message || 'Something went wrong'); toast.error('Payment failed')
    }
  }, [phone, name, items, totalPrice, userId, address, city, postalCode, email, clearCart, navigate])

  if (status === 'success') {
    return (
      <div className="bg-background min-h-screen pt-24 pb-16">
        <div className="container mx-auto px-4 text-center py-20 max-w-md">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h1 className="font-display text-3xl font-bold text-foreground mb-3">Payment Successful!</h1>
          <p className="text-muted-foreground mb-8">Your order has been confirmed. We'll reach out via WhatsApp for delivery details.</p>
          <Link to="/shop" className="inline-block bg-primary text-primary-foreground px-8 py-3 font-bold text-sm tracking-wider uppercase rounded-lg">Continue Shopping</Link>
        </div>
      </div>
    )
  }

  if (items.length === 0 && status !== 'success') {
    return (
      <div className="bg-background min-h-screen pt-24 pb-16">
        <div className="container mx-auto px-4 text-center py-20">
          <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Your cart is empty</h1>
          <p className="text-muted-foreground mb-6">Add some items before checking out</p>
          <Link to="/shop" className="inline-block bg-primary text-primary-foreground px-8 py-3 font-bold text-sm tracking-wider uppercase rounded-lg">Go to Shop</Link>
        </div>
      </div>
    )
  }

  const isProcessing = status === 'creating' || status === 'pushing' || status === 'polling'
  const canGoToShipping = items.length > 0
  const canGoToPayment = name.trim() && phone.length >= 9

  return (
    <div className="bg-muted/30 min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <button onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> {step > 0 ? 'Back' : 'Continue Shopping'}
        </button>

        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">Checkout</h1>
        <CheckoutStepper step={step} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Step 0: Cart Review */}
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
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-lg border border-border flex-shrink-0" />
                      ) : (
                        <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-xs flex-shrink-0">No img</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-sm truncate">{item.name}</h3>
                        <p className="text-primary font-bold text-sm mt-1">KSh {item.price.toLocaleString()}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center border border-border rounded-lg">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-1.5 hover:bg-accent transition-colors rounded-l-lg" aria-label="Decrease quantity">
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-3 text-sm font-medium min-w-[2rem] text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-1.5 hover:bg-accent transition-colors rounded-r-lg" aria-label="Increase quantity">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="text-destructive hover:text-destructive/80 transition-colors" aria-label="Remove">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-foreground text-sm">KSh {(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-border">
                  <button onClick={() => setStep(1)} disabled={!canGoToShipping}
                    className="w-full bg-primary text-primary-foreground py-3 font-bold text-sm tracking-wider uppercase rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    style={{ minHeight: '48px' }}>
                    Proceed to Shipping
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Shipping Details */}
            {step === 1 && (
              <div className="bg-card border border-border rounded-lg">
                <div className="p-4 border-b border-border">
                  <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" /> Shipping Details
                  </h2>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Full Name *</label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Linda Amollo"
                        className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number *</label>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0748207000"
                        className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Email (optional)</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                      className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Street Address</label>
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street address / building / estate"
                      className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">City / Town</label>
                      <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Nairobi"
                        className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Postal Code</label>
                      <input type="text" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="00100"
                        className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                    </div>
                  </div>
                  <button onClick={() => setStep(2)} disabled={!canGoToPayment}
                    className="w-full bg-primary text-primary-foreground py-3 font-bold text-sm tracking-wider uppercase rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 mt-2"
                    style={{ minHeight: '48px' }}>
                    Proceed to Payment
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <div className="bg-card border border-border rounded-lg">
                <div className="p-4 border-b border-border">
                  <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
                    <Phone className="w-5 h-5 text-primary" /> Pay with M-Pesa
                  </h2>
                </div>
                <div className="p-4 space-y-4">
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      <strong>How it works:</strong> Click "Pay Now" and you'll receive an M-Pesa STK push on <strong>{phone}</strong>. Enter your PIN to complete payment.
                    </p>
                  </div>

                  {/* Shipping summary */}
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong className="text-foreground">Delivering to:</strong> {name}</p>
                    {address && <p>{address}, {city} {postalCode}</p>}
                    <p>Phone: {phone}</p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                      <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
                    </div>
                  )}

                  <button onClick={handleMpesaPayment} disabled={isProcessing || !authChecked}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-4 font-bold text-sm tracking-wider uppercase rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ minHeight: '52px' }}>
                    {!authChecked && <><Loader2 className="w-5 h-5 animate-spin" /> Verifying account...</>}
                    {authChecked && status === 'creating' && <><Loader2 className="w-5 h-5 animate-spin" /> Creating order...</>}
                    {authChecked && status === 'pushing' && <><Loader2 className="w-5 h-5 animate-spin" /> Sending STK push...</>}
                    {authChecked && status === 'polling' && <><Loader2 className="w-5 h-5 animate-spin" /> Waiting for payment...</>}
                    {authChecked && (status === 'idle' || status === 'failed') && <>Pay KSh {totalPrice.toLocaleString()} Now</>}
                  </button>

                  {status === 'polling' && (
                    <p className="text-center text-sm text-muted-foreground">Check your phone and enter your M-Pesa PIN to complete payment</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-lg sticky top-28">
              <div className="p-4 border-b border-border">
                <h2 className="font-display font-semibold text-foreground text-sm uppercase tracking-wider">Order Summary</h2>
              </div>
              <div className="p-4 space-y-3">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between items-start text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground truncate block">{item.name}</span>
                      <span className="text-muted-foreground text-xs">Qty: {item.quantity}</span>
                    </div>
                    <span className="font-semibold text-foreground ml-2 whitespace-nowrap">KSh {(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">KSh {totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-green-600 font-medium">Free</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="font-display font-bold text-foreground">Total</span>
                  <span className="font-bold text-lg text-primary">KSh {totalPrice.toLocaleString()}</span>
                </div>
              </div>
              <div className="p-4 pt-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  <span>Secure checkout powered by M-Pesa</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
