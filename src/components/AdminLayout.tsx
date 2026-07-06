import { useEffect, useState } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Package, MessageSquare, LogOut, LayoutDashboard, ChevronLeft, Image, ShoppingBag, Grid3X3, FileText, Camera, Truck, CreditCard, Star, Boxes, Mail, BookOpen, Tag, MapPin } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { useSEO } from '@/hooks/useSEO'

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Inventory', href: '/admin/inventory', icon: Boxes },
  { label: 'Coupons', href: '/admin/coupons', icon: Tag },
  { label: 'Delivery Areas', href: '/admin/delivery-areas', icon: MapPin },
  { label: 'Hero Slides', href: '/admin/hero', icon: Image },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingBag },
  { label: 'Reviews', href: '/admin/reviews', icon: Star },
  { label: 'Categories', href: '/admin/categories', icon: Grid3X3 },
  { label: 'Shipping', href: '/admin/shipping', icon: Truck },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard },
  { label: 'Enquiries', href: '/admin/enquiries', icon: MessageSquare },
  { label: 'Site Content', href: '/admin/content', icon: FileText },
  { label: 'Chronicle Posts', href: '/admin/chronicle', icon: BookOpen },
  { label: 'Tribe Looks', href: '/admin/tribe-looks', icon: Camera },
  { label: 'Newsletter', href: '/admin/newsletter', icon: Mail },
]

export default function AdminLayout() {
  useSEO('Admin', undefined, undefined, true)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { navigate('/admin/login'); setLoading(false); return }
      
      // Check if user is in admin_users table
      const { data: adminRecord } = await supabase.from('admin_users').select('id').eq('user_id', authUser.id).maybeSingle()
      if (!adminRecord) {
        await supabase.auth.signOut()
        navigate('/admin/login')
        setLoading(false)
        return
      }
      setUser(authUser)
      setLoading(false)
    }
    checkAccess()
  }, [navigate])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Loading...</p></div>
  if (!user) return null

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col shrink-0 hidden md:flex">
        <div className="p-6 border-b border-border">
          <h2 className="font-display text-lg font-bold text-foreground">USHANGA</h2>
          <p className="text-xs text-muted-foreground">Admin Panel</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                location.pathname === item.href
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          <Link to="/" className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Site
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:text-destructive/80 transition-colors w-full">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <h2 className="font-display text-sm font-bold">USHANGA Admin</h2>
        <div className="flex items-center gap-2">
          {navItems.map(item => (
            <Link
              key={item.href}
              to={item.href}
              className={`p-2 rounded-md ${location.pathname === item.href ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
            >
              <item.icon className="w-5 h-5" />
            </Link>
          ))}
          <button onClick={handleLogout} className="p-2 text-destructive"><LogOut className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto md:p-8 p-4 pt-16 md:pt-8">
        <Outlet />
      </main>
    </div>
  )
}
