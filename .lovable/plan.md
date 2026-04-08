## Plan

### 1. Database Migration
- Create `products` table (name, price, category, image_url, stock, description)
- Create `enquiry_messages` table for customer chat (with reply support)
- Create storage bucket for product images
- Add admin role system

### 2. Fix Header Overlay
- Ensure navbar doesn't overlay page content on scroll

### 3. Admin Panel Pages
- `/admin` - Dashboard with overview
- Product management: add, edit, delete products with image upload
- Enquiry inbox: view customer messages and reply

### 4. Authentication
- Admin login page
- Protected admin routes

### 5. Connect Shop Page
- Load products from database instead of hardcoded data
