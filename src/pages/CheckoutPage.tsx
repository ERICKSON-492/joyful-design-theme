import { useState, useEffect, useCallback } from 'react'
import { useCart } from '@/contexts/CartContext'
import { supabase } from '@/integrations/supabase/client'
import { useCheckoutAuth } from '@/hooks/useCheckoutAuth'
import { toast } from 'sonner'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, Phone, Loader2, CheckCircle, XCircle, ArrowLeft, MapPin, Minus, Plus, Trash2, ShieldCheck, Truck, CreditCard } from 'lucide-react'
import { fetchPublicTable } from '@/lib/publicContent'

type PaymentStatus = 'idle' | 'creating' | 'pushing' | 'polling' | 'success' | 'failed'

interface ShippingMethod {
  id: string; name: string; type: string; provider: string; estimated_days: string | null; price: number; regions: string[]
}

interface PaymentMethodOption {
  id: string; name: string; provider: string; is_active: boolean
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
  const { userId, authChecked, name: accountName, email: accountEmail } = useCheckoutAuth()

  useEffect(() => {
    if (accountName) setName(prev => prev || accountName)
    if (accountEmail) setEmail(prev => prev || accountEmail)
  }, [accountName, accountEmail])

  // Load shipping & payment methods
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
      } catch { /* ignore */ }
    }
    load()
  }, [])

  const isInternational = country !== 'Kenya'
  const filteredShipping = shippingMethods.filter(m => isInternational ? m.type === 'international' : m.type === 'local')
  const shippingCost = selectedShipping?.price || 0
  const grandTotal = totalPrice + shippingCost

  const kenyanCounties = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi', 'Kitale', 'Garissa', 'Nyeri', 'Machakos', 'Meru', 'Lamu', 'Nanyuki', 'Kajiado', 'Kiambu', 'Other']

  // Helper: enqueue order confirmation email with full itemised receipt
  const sendOrderEmail = useCallback(async (orderId: string) => {
    const targetEmail = email || accountEmail;
    if (!targetEmail) {
      console.log("Skipping email transmission: No email address available.");
      return;
    }

    // Itemised rows: name, qty, unit price, line total
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:14px;color:#374151;">
          <div style="font-weight:600;color:#111827;">${item.name}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px;">Qty ${item.quantity} × KSh ${item.price.toLocaleString()}</div>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:14px;font-weight:700;color:#111827;text-align:right;white-space:nowrap;">
          KSh ${(item.price * item.quantity).toLocaleString()}
        </td>
      </tr>
    `).join('');

    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

    const emailHtml = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;background-color:#ffffff;">
        <div style="text-align:center;margin-bottom:24px;">
          <h2 style="color:#D4A017;margin:0 0 8px 0;font-size:24px;font-weight:700;">Asante for your order!</h2>
          <p style="color:#4b5563;margin:0;font-size:14px;">Hi ${name || 'there'}, your order has been received.</p>
        </div>

        <p style="color:#374151;font-size:15px;line-height:1.5;">Order <strong>#${orderId}</strong> is now being prepared. Here are your items:</p>

        <div style="margin:20px 0;background-color:#fafafa;border-radius:8px;padding:16px;">
          <h3 style="margin:0 0 12px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;font-weight:700;">Order Summary</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <table style="width:100%;border-collapse:collapse;margin-top:14px;">
            <tbody>
              <tr>
                <td style="padding:4px 8px;font-size:13px;color:#6b7280;">Subtotal</td>
                <td style="padding:4px 8px;font-size:13px;color:#374151;text-align:right;">KSh ${subtotal.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding:4px 8px;font-size:13px;color:#6b7280;">Shipping${selectedShipping ? ` (${selectedShipping.name})` : ''}</td>
                <td style="padding:4px 8px;font-size:13px;color:#374151;text-align:right;">KSh ${shippingCost.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding:10px 8px;font-size:15px;font-weight:800;color:#111827;border-top:2px solid #e5e7eb;">Grand Total</td>
                <td style="padding:10px 8px;font-size:18px;font-weight:800;color:#D4A017;text-align:right;border-top:2px solid #e5e7eb;">KSh ${grandTotal.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280;line-height:1.5;">
          ${selectedShipping ? `<p style="margin:0 0 4px 0;"><strong style="color:#374151;">Delivery:</strong> ${selectedShipping.name} (${selectedShipping.estimated_days || 'soon'})</p>` : ''}
          <p style="margin:0;">Any questions? Reply to this email or reach us on WhatsApp.</p>
        </div>
      </div>
    `;

    try {
      const { error: rpcError } = await supabase.rpc('enqueue_transactional_email', {
        recipient_email: targetEmail,
        subject_text: `Ushanga Chronicles: Order Confirmation #${orderId}`,
        html_body: emailHtml,
        template_label: 'order-confirmation',
      });
      if (rpcError) throw rpcError;
      console.log("Order confirmation email enqueued.");
    } catch (err) {
      console.error("Failed to enqueue order confirmation email:", err);
    }
  }, [email, accountEmail, name, grandTotal, items, selectedShipping, shippingCost]);

  const handleMpesaPayment = useCallback(async () => {
    if (!userId) {
      toast.error('Please log in first')
      navigate('/auth', { state: { returnTo: '/checkout' } })
      return
    }
    if (!phone || phone.length < 9) { setError('Please enter a valid phone number'); return }
    if (!name.trim()) { setError('Please enter your name'); return }
    if (items.length === 0) return

    setError('')
    setStatus('creating')

    try {
      const orderItems = items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity }))

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          phone, customer_name: name, total_amount: grandTotal,
          items: orderItems as any, status: selectedPayment === 'cod' ? 'confirmed' : 'pending', user_id: userId,
          shipping_address: { address, city, county, postal_code: postalCode, country, email, shipping_method: selectedShipping?.name, shipping_cost: shippingCost },
        })
        .select('id').single()

      if (orderError || !order) throw new Error('Failed to create order')

      // Cash on Delivery Pipeline Flow
      if (selectedPayment === 'cod') {
        await sendOrderEmail(order.id)
        setStatus('success')
        clearCart()
        toast.success('Order placed! Pay on delivery 🎉')
        return
      }

      // M-Pesa Pipeline Flow
      setStatus('pushing')
      const { data: stkData, error: stkError } = await supabase.functions.invoke(
        'mpesa-stk-push', { body: { phone, amount: grandTotal, order_id: order.id } }
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
            await sendOrderEmail(order.id)
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
          if (orderCheck?.status === 'paid') { 
            await sendOrderEmail(order.id)
            setStatus('success'); clearCart(); toast.success('Payment successful! 🎉') 
          }
          else { setStatus('failed'); setError('Payment timed out. If money was deducted, contact us on WhatsApp.') }
        }
      }
      setTimeout(poll, 4000)
    } catch (err: any) {
      setStatus('failed'); setError(err.message || 'Something went wrong'); toast.error('Payment failed')
    }
  }, [phone, name, items, grandTotal, userId, address, city, county, postalCode, country, email, selectedShipping, shippingCost, selectedPayment, clearCart, navigate, sendOrderEmail])

  if (status === 'success') {
    return (
      <div className="bg-background min-h-screen pt-24 pb-16">
        <div className="container mx-auto px-4 text-center py-20 max-w-md">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h1 className="font-display text-3xl font-bold text-foreground mb-3">Order Confirmed!</h1>
          <p className="text-muted-foreground mb-8">
            {selectedPayment === 'cod' ? "Your order has been placed. Pay on delivery." : "Payment successful! We'll reach out via WhatsApp for delivery details."}
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
          <p className="text-muted-foreground mb-6">Add some items before checking out</p>
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
            {/* Step 0: Cart */}
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
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1.5 hover:bg-accent transition-colors rounded-l-lg"><Minus className="w-3.5 h-3.5" /></button>
                            <span className="px-3 text-sm font-medium min-w-[2rem] text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1.5 hover:bg-accent transition-colors rounded-r-lg"><Plus className="w-3.5 h-3.5" /></button>
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
                  <button onClick={() => setStep(1)} disabled={!canGoToShipping}
                    className="w-full bg-primary text-primary-foreground py-3 font-bold text-sm tracking-wider uppercase rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50" style={{ minHeight: '48px' }}>
                    Proceed to Shipping
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Shipping */}
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

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Country</label>
                    <select value={country} onChange={e => { setCountry(e.target.value); setSelectedShipping(null) }}
                      className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 text-sm">
                      <option value="Kenya">🇰🇪 Kenya</option>
                      <option value="Tanzania">🇹🇿 Tanzania</option>
                      <option value="Uganda">🇺🇬 Uganda</option>
                      <option value="Rwanda">🇷🇼 Rwanda</option>
                      <option value="Ethiopia">🇪🇹 Ethiopia</option>
                      <option value="Other">🌍 Other (International)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Street Address</label>
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street / building / estate"
                      className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
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
                          className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Postal Code</label>
                      <input type="text" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="00100"
                        className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                    </div>
                  </div>

                  {/* Shipping Method Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-primary" /> Choose Delivery Method *
                    </label>
                    {filteredShipping.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No shipping methods available for this destination.</p>
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
                              <p className="text-xs text-muted-foreground">{m.estimated_days} · {(m.regions || []).join(', ')}</p>
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

            {/* Step 2: Payment */}
            {step === 2 && (
              <div className="bg-card border border-border rounded-lg">
                <div className="p-4 border-b border-border">
                  <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" /> Payment
                  </h2>
                </div>
                <div className="p-4 space-y-4">
                  {/* Payment method selection */}
                  {paymentMethods.length > 1 && (
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
                            {pm.provider === 'pesapal' && <p className="text-xs text-muted-foreground">Pay with card or mobile money</p>}
                            {pm.provider === 'cod' && <p className="text-xs text-muted-foreground">Pay when you receive your order</p>}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {selectedPayment === 'mpesa' && (
                    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        <strong>How it works:</strong> Click "Pay Now" and you'll receive an M-Pesa STK push on <strong>{phone}</strong>. Enter your PIN to complete payment.
                      </p>
                    </div>
                  )}

                  {selectedPayment === 'cod' && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Cash on Delivery:</strong> Pay KSh {grandTotal.toLocaleString()} when you receive your order. Delivery via {selectedShipping?.name}.
                      </p>
                    </div>
                  )}

                  {selectedPayment === 'pesapal' && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>Pesapal:</strong> You'll be redirected to Pesapal to complete payment via card or mobile money.
                      </p>
                    </div>
                  )}

                  {/* Shipping summary */}
                  <div className="text-sm text-muted-foreground space-y-1 border-t border-border pt-3">
                    <p><strong className="text-foreground">Delivering to:</strong> {name}</p>
                    {address && <p>{address}, {county || city} {postalCode}</p>}
                    {selectedShipping && <p>Via {selectedShipping.name} ({selectedShipping.estimated_days})</p>}
                    <p>Phone: {phone}</p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                      <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
                    </div>
                  )}

                  <button onClick={handleMpesaPayment} disabled={isProcessing || !authChecked}
                    className={`w-full py-4 font-bold text-sm tracking-wider uppercase rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${
                      selectedPayment === 'mpesa' ? 'bg-green-600 hover:bg-green-700 text-white' :
                      selectedPayment === 'cod' ? 'bg-primary hover:bg-primary/90 text-primary-foreground' :
                      'bg-blue-600 hover:bg-blue-700 text-white'
                    }`} style={{ minHeight: '52px' }}>
                    {!authChecked && <><Loader2 className="w-5 h-5 animate-spin" /> Verifying account...</>}
                    {authChecked && status === 'creating' && <><Loader2 className="w-5 h-5 animate-spin" /> Creating order...</>}
                    {authChecked && status === 'pushing' && <><Loader2 className="w-5 h-5 animate-spin" /> Sending STK push...</>}
                    {authChecked && status === 'polling' && <><Loader2 className="w-5 h-5 animate-spin" /> Waiting for payment...</>}
                    {authChecked && (status === 'idle' || status === 'failed') && (
                      selectedPayment === 'cod' ? 'Place Order' : `Pay KSh ${grandTotal.toLocaleString()} Now`
                    )}
                  </button>

                  {status === 'polling' && (
                    <p className="text-center text-sm text-muted-foreground">Check your phone and enter your M-Pesa PIN to complete payment</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Side panel */}
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
                  {selectedShipping ? (
                    <span className="text-foreground font-medium">KSh {shippingCost.toLocaleString()}</span>
                  ) : (
                    <span className="text-muted-foreground italic text-xs">Select at next step</span>
                  )}
                </div>
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="font-display font-bold text-foreground">Total</span>
                  <span className="font-bold text-lg text-primary">KSh {grandTotal.toLocaleString()}</span>
                </div>
              </div>
              <div className="p-4 pt-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  <span>Secure checkout</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
