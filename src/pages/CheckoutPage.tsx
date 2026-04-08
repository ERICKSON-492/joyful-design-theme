import { useState, useEffect, useCallback } from 'react'
import { useCart } from '@/contexts/CartContext'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, Phone, Loader2, CheckCircle, XCircle, ArrowLeft, MapPin } from 'lucide-react'

type PaymentStatus = 'idle' | 'creating' | 'pushing' | 'polling' | 'success' | 'failed'

export default function CheckoutPage() {
  const { items, totalPrice, clearCart, totalItems } = useCart()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [error, setError] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Auth check using onAuthStateChange (more reliable than getSession alone)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id)
        setName(prev => prev || session.user.user_metadata?.full_name || '')
        setEmail(prev => prev || session.user.email || '')
        setAuthChecked(true)
      }
    })

    // Also call getSession to handle already-authenticated users
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        toast.error('Please log in or create an account to checkout')
        navigate('/auth', { state: { returnTo: '/checkout' } })
        return
      }
      setUserId(session.user.id)
      setName(prev => prev || session.user.user_metadata?.full_name || '')
      setEmail(prev => prev || session.user.email || '')
      setAuthChecked(true)
    })

    return () => subscription.unsubscribe()
  }, [navigate])

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
          <Link to="/shop" className="inline-block bg-primary text-primary-foreground px-8 py-3 font-bold text-sm tracking-wider uppercase">Continue Shopping</Link>
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
          <p className="text-muted-foreground mb-6">Add some items before checking out</p>
          <Link to="/shop" className="inline-block bg-primary text-primary-foreground px-8 py-3 font-bold text-sm tracking-wider uppercase">Go to Shop</Link>
        </div>
      </div>
    )
  }

  const isProcessing = status === 'creating' || status === 'pushing' || status === 'polling'
  const inputDisabled = isProcessing

  return (
    <div className="bg-background min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-2xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8">Checkout</h1>

        {/* Order Summary */}
        <div className="bg-card border border-border rounded-lg p-5 mb-6">
          <h2 className="font-display font-semibold text-foreground mb-4">Order Summary ({totalItems} items)</h2>
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <span className="text-foreground">{item.name} <span className="text-muted-foreground">× {item.quantity}</span></span>
                <span className="font-semibold text-foreground">KSh {(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border mt-4 pt-4 flex justify-between items-center">
            <span className="font-display font-bold text-lg text-foreground">Total</span>
            <span className="font-bold text-xl text-primary">KSh {totalPrice.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment Form */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" /> Pay with M-Pesa
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Your Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Linda Amollo"
                className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" disabled={inputDisabled} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">M-Pesa Phone Number</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0748207000 or 254748207000"
                className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" disabled={inputDisabled} />
              <p className="text-xs text-muted-foreground mt-1">You'll receive an STK push prompt on this number</p>
            </div>

            <div className="border-t border-border pt-4 mt-4">
              <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Shipping Address
              </h3>
              <div className="space-y-3">
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street address / building / estate"
                  className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-sm" disabled={inputDisabled} />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="City / Town"
                    className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-sm" disabled={inputDisabled} />
                  <input type="text" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="Postal code"
                    className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-sm" disabled={inputDisabled} />
                </div>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email for order updates (optional)"
                  className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-sm" disabled={inputDisabled} />
              </div>
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
              {authChecked && (status === 'idle' || status === 'failed') && <>Pay KSh {totalPrice.toLocaleString()} via M-Pesa</>}
            </button>

            {status === 'polling' && (
              <p className="text-center text-sm text-muted-foreground">Check your phone and enter your M-Pesa PIN to complete payment</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
