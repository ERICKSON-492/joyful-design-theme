
## Plan: Auth, Shipping & Order Tracking

### 1. User Authentication
- Add login/signup pages with email + password
- Enable Google sign-in via Lovable Cloud
- Create a `profiles` table to store user display name and phone
- Auto-create profile on signup via database trigger
- Protect order history behind authentication

### 2. Shipping & Checkout Enhancement
- Add shipping address fields to checkout (name, address, city, postal code)
- Add a `shipping_address` column to the `orders` table
- Save shipping info with each order

### 3. Order Tracking for Customers
- Add a "My Orders" page where logged-in users can view their order history and status
- Link orders to user accounts via `user_id`
- Show order status timeline (pending → confirmed → shipped → delivered)
- Add a link to "My Orders" in the navbar for logged-in users

### What stays the same
- Admin dashboard and admin order management remain unchanged
- M-Pesa and WhatsApp checkout options stay as-is
