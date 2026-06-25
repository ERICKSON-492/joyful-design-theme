import { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { X, Plus, Minus, Trash2, ShoppingBag, LogIn, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';

export function CartDrawer() {
  const { 
    items, 
    isOpen, 
    setIsOpen, 
    removeFromCart, 
    updateQuantity, 
    totalItems, 
    totalPrice, 
    clearCart,
    addToCart 
  } = useCart();
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { format, currency } = useCurrency();

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    check();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsLoggedIn(!!session);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleUpdateQuantity = async (id: string, newQuantity: number) => {
    await updateQuantity(id, newQuantity);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background z-[61] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <h2 className="font-display text-lg font-bold text-foreground">Your Cart ({totalItems})</h2>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-2 hover:bg-accent rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                  <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">Your cart is empty</p>
                  <div className="flex flex-col gap-2 max-w-xs mx-auto pt-2">
                    <Link
                      to="/shop"
                      onClick={() => setIsOpen(false)}
                      className="block w-full bg-primary text-primary-foreground text-center py-2.5 text-sm font-bold tracking-wider uppercase rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Start Shopping
                    </Link>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                    >
                      Continue Shopping
                    </button>
                  </div>
                </div>
              ) : (
                items.map(item => {
                  const isAtMaxStock = item.quantity >= item.stock;
                  const isAtMinStock = item.quantity <= 1;

                  return (
                    <div key={item.id} className="flex gap-3 bg-card border border-border rounded-lg p-3">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.name} 
                          className="w-20 h-20 object-cover rounded" 
                        />
                      ) : (
                        <div className="w-20 h-20 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                          No img
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-foreground truncate">{item.name}</h3>
                        <p className="text-primary font-bold text-sm mt-0.5">{format(item.price)}</p>
                        
                        {/* Stock indicator */}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs ${
                            item.stock <= 5 
                              ? 'text-red-500 font-semibold' 
                              : item.stock <= 10 
                                ? 'text-orange-500' 
                                : 'text-muted-foreground'
                          }`}>
                            {item.stock} available
                          </span>
                          {item.stock <= 5 && (
                            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                              Low Stock!
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            className={`w-7 h-7 flex items-center justify-center border border-border rounded hover:bg-accent transition-colors ${
                              isAtMinStock ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            disabled={isAtMinStock}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          
                          <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                          
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            className={`w-7 h-7 flex items-center justify-center border border-border rounded hover:bg-accent transition-colors ${
                              isAtMaxStock ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            disabled={isAtMaxStock}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="ml-auto p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Max stock warning */}
                        {isAtMaxStock && (
                          <p className="text-xs text-red-500 mt-1">
                            Maximum stock reached
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-border p-4 space-y-3 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <span className="font-display font-semibold text-foreground">Total</span>
                  <span className="font-bold text-lg text-primary">{format(totalPrice)}</span>
                </div>
                
                {currency !== 'KES' && (
                  <p className="text-[11px] text-muted-foreground text-center">
                    Approx. shown in {currency}. You will be charged{' '}
                    <span className="font-semibold">KSh {totalPrice.toLocaleString()}</span> at checkout.
                  </p>
                )}
                
                {isLoggedIn ? (
                  <Link
                    to="/checkout"
                    onClick={() => setIsOpen(false)}
                    className="block w-full bg-green-600 hover:bg-green-700 text-white text-center py-3 font-bold text-sm tracking-wider uppercase transition-colors rounded-lg"
                    style={{ minHeight: '44px' }}
                  >
                    Proceed to checkout
                  </Link>
                ) : (
                  <Link
                    to="/auth"
                    state={{ returnTo: '/checkout' }}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/90 text-primary-foreground text-center py-3 font-bold text-sm tracking-wider uppercase transition-colors rounded-lg"
                    style={{ minHeight: '44px' }}
                  >
                    <LogIn className="w-4 h-4" />
                    Log In to Checkout
                  </Link>
                )}
                
                <a
                  href={`https://wa.me/254748207000?text=${encodeURIComponent(
                    `Hi! I'd like to order:\n${items.map(i => `• ${i.name} x${i.quantity} - KSh ${(i.price * i.quantity).toLocaleString()}`).join('\n')}\n\nTotal: KSh ${totalPrice.toLocaleString()}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full border border-border text-foreground text-center py-3 font-bold text-sm tracking-wider uppercase hover:bg-accent transition-colors rounded-lg"
                  style={{ minHeight: '44px' }}
                >
                  Order via WhatsApp
                </a>
                
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground text-center py-3 font-bold text-sm tracking-wider uppercase transition-colors rounded-lg"
                  style={{ minHeight: '44px' }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Continue Shopping
                </button>

                <button
                  onClick={clearCart}
                  className="w-full text-center text-xs text-muted-foreground hover:text-destructive transition-colors pt-1"
                >
                  Clear Cart
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
