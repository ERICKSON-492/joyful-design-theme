/**
 * Helpers for serving correctly-sized product images.
 *
 * Supabase Storage *can* transform images on the fly via the
 * /render/image/public/ endpoint, but that's a paid/opt-in feature that
 * isn't enabled on every Supabase project. When it isn't enabled, that
 * endpoint returns 403 FeatureNotEnabled instead of an image — which is
 * exactly what was causing blank product images across the site.
 *
 * Transformations are OFF by default here. If you've confirmed Image
 * Transformations is actually enabled for this Supabase project (Settings →
 * Add-ons), flip TRANSFORMS_ENABLED to true to get resized/srcset variants;
 * until then, every helper below just returns the original public object
 * URL untouched, which always works.
 */

const TRANSFORMS_ENABLED = false

const STORAGE_OBJECT = '/storage/v1/object/public/'
const STORAGE_RENDER = '/storage/v1/render/image/public/'

export function isTransformable(url: string | null | undefined): boolean {
  return TRANSFORMS_ENABLED && !!url && url.includes(STORAGE_OBJECT)
}

/** Always returns the original, always-working public object URL. */
export function originalImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  // If a /render/image/ URL somehow ends up stored/passed in, convert it
  // back to the plain object URL rather than trying to "undo" query params.
  return url.includes(STORAGE_RENDER) ? url.replace(STORAGE_RENDER, STORAGE_OBJECT).split('?')[0] : url
}

export function resizedImage(url: string, width: number, quality = 78): string {
  if (!isTransformable(url)) return url
  const base = url.replace(STORAGE_OBJECT, STORAGE_RENDER)
  return `${base}?width=${width}&height=${width}&resize=cover&quality=${quality}`
}

/**
 * Build a srcset of square variants for a product thumbnail.
 * Returns undefined when the URL cannot be transformed (external images, or
 * transforms disabled) — callers should fall back to a plain `src`.
 */
export function productSrcSet(
  url: string | null | undefined,
  widths: number[] = [200, 300, 400, 600, 800],
): string | undefined {
  if (!url || !isTransformable(url)) return undefined
  return widths.map(w => `${resizedImage(url, w)} ${w}w`).join(', ')
}

/** Default src for a thumbnail: a pre-sized variant when available, otherwise the original. */
export function productThumb(url: string | null | undefined, width = 400): string | undefined {
  if (!url) return undefined
  return isTransformable(url) ? resizedImage(url, width) : url
}

/**
 * Attach to an <img>'s onError to fall back to the original object URL if an
 * optimized/transformed variant ever fails to load, instead of showing a
 * blank tile. Safe to call even when transforms are disabled (it's then a
 * no-op, since src is already the original).
 */
export function handleImageFallback(
  e: React.SyntheticEvent<HTMLImageElement>,
  originalUrl: string | null | undefined
) {
  const img = e.currentTarget
  const original = originalImageUrl(originalUrl)
  if (original && img.src !== original && !img.dataset.fallbackApplied) {
    img.dataset.fallbackApplied = 'true'
    img.srcset = ''
    img.src = original
  } else {
    img.dataset.fallbackFailed = 'true'
  }
}

/** `sizes` for a 2-up mobile / 4-up desktop product grid. */
export const GRID_SIZES = '(min-width: 1024px) 300px, (min-width: 768px) 25vw, 50vw'
