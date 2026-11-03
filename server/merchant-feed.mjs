const SITE_URL = 'https://ushangachronicles.com'
const API_URL = 'https://joyful-design-theme.onrender.com'

export const MERCHANT_FEED_HEADERS = [
  'id',
  'title',
  'description',
  'link',
  'image_link',
  'availability',
  'availability_date',
  'condition',
  'price',
  'sale_price',
  'brand',
  'product_type',
]

export function merchantProductSlug(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function cleanTsvValue(value) {
  return String(value ?? '').replace(/[\t\r\n\u0000-\u001f]+/g, ' ').trim()
}

function absoluteImageUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.startsWith('/')) return `${SITE_URL}${raw}`

  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    return ''
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return ''
  if (parsed.hash === '#supabase-fallback') return raw

  const storagePath = parsed.pathname.match(/^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
  if (storagePath) {
    const bucket = decodeURIComponent(storagePath[1])
    const objectKey = storagePath[2].split('/').map(part => encodeURIComponent(decodeURIComponent(part))).join('/')
    return `${API_URL}/api/storage/public/${encodeURIComponent(bucket)}/${objectKey}`
  }
  return raw
}

function formatPrice(value) {
  const price = Number(value)
  if (!Number.isFinite(price) || price <= 0) throw new Error(`Invalid product price: ${value}`)
  return `${price.toFixed(2)} KES`
}

function formatAvailabilityDate(value) {
  if (!value) return ''
  const date = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Invalid preorder availability date: ${value}`)
  const parsed = new Date(`${date}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error(`Invalid preorder availability date: ${value}`)
  }
  // Midnight East Africa Time, in Merchant Center's accepted ISO-8601 form.
  return `${date}T00:00+0300`
}

export function buildMerchantFeed(products, { activeSalePrice = () => null } = {}) {
  const lines = [MERCHANT_FEED_HEADERS.join('\t')]
  for (const product of products) {
    if (!product?.id || !String(product.name || '').trim()) {
      throw new Error('Every Merchant Center feed item must have an ID and title')
    }
    const name = String(product.name).trim()
    if ([...name].length > 150) throw new Error(`Product ${product.id} title exceeds Google's 150-character limit`)
    const slug = merchantProductSlug(name)
    if (!slug) throw new Error(`Cannot create a canonical product URL for ${product.id}`)

    const imageCandidates = [product.image_url, ...(Array.isArray(product.image_urls) ? product.image_urls : [])]
    const images = [...new Set(imageCandidates.map(absoluteImageUrl).filter(Boolean))]
    if (!images.length) throw new Error(`Product ${product.id} is missing a valid image URL`)

    const preorder = product.is_preorder === true
    const availability = preorder ? 'preorder' : (Number(product.stock || 0) > 0 ? 'in_stock' : 'out_of_stock')
    const availabilityDate = preorder ? formatAvailabilityDate(product.preorder_available_date) : ''
    if (preorder && !availabilityDate) {
      throw new Error(`Preorder product ${product.id} is missing preorder_available_date`)
    }

    const sale = activeSalePrice(product)
    const description = String(product.description || `Handcrafted ${name} from Ushanga Chronicles.`)
    const fields = [
      product.id,
      name,
      description,
      `${SITE_URL}/products/${slug}/`,
      images[0],
      availability,
      availabilityDate,
      'new',
      formatPrice(product.price),
      sale ? formatPrice(sale) : '',
      'Ushanga Chronicles',
      product.category || 'Handmade products',
    ]
    lines.push(fields.map(cleanTsvValue).join('\t'))
  }
  return `${lines.join('\n')}\n`
}
