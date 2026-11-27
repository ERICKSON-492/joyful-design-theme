import { createClient } from '@supabase/supabase-js'

const booksSyncUrl = process.env.USHANGA_BOOKS_SYNC_URL
const syncSecret = process.env.STORE_SYNC_SECRET

function required(name, value) {
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

export async function pushUshangaBooksSnapshot() {
  const supabase = createClient(
    required('SUPABASE_URL', process.env.SUPABASE_URL),
    required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const [{ data: products, error: productsError }, { data: orders, error: ordersError }, { data: customOrders, error: customOrdersError }] = await Promise.all([
    supabase.from('products').select('id,name,category,subcategory,price,sale_price,stock,is_active'),
    supabase.from('orders').select('id,phone,customer_name,email,total_amount,status,items,shipping_cost,created_at'),
    supabase.from('custom_orders').select('id,category,vision,colors,materials,name,phone,email,delivery_location,status,created_at'),
  ])

  if (productsError) throw productsError
  if (ordersError) throw ordersError
  if (customOrdersError) throw customOrdersError

  const response = await fetch(`${required('USHANGA_BOOKS_SYNC_URL', booksSyncUrl)}/api/store-sync`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-store-sync-secret': required('STORE_SYNC_SECRET', syncSecret),
    },
    body: JSON.stringify({
      products: (products ?? []).map((product) => ({
        externalId: product.id,
        name: product.name,
        category: product.category,
        subcategory: product.subcategory,
        salePrice: product.sale_price ?? product.price,
        stock: product.stock,
        isActive: product.is_active,
      })),
      orders: (orders ?? []).map((order) => ({
        externalId: order.id,
        customerName: order.customer_name,
        customerEmail: order.email,
        customerPhone: order.phone,
        totalAmount: order.total_amount,
        shippingCost: order.shipping_cost ?? 0,
        currency: 'KES',
        status: order.status,
        items: order.items,
        orderDate: order.created_at,
      })),
      customOrders: (customOrders ?? []).map((order) => ({
        externalId: order.id,
        category: order.category,
        vision: order.vision,
        colors: order.colors ?? [],
        requestedMaterials: order.materials,
        customerName: order.name,
        customerPhone: order.phone,
        customerEmail: order.email,
        deliveryLocation: order.delivery_location,
        status: order.status,
        orderDate: order.created_at,
      })),
    }),
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`Ushanga Books sync failed (${response.status}): ${body.error ?? 'unknown error'}`)
  return body
}

if (import.meta.url === `file://${process.argv[1]}`) {
  pushUshangaBooksSnapshot().then((result) => {
    console.log(`Ushanga Books sync complete: ${result.records ?? 0} records`)
  }).catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
