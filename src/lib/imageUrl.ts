/**
 * Helpers for serving correctly-sized product images.
 *
 * Supabase Storage supports on-the-fly image transformation via the
 * /render/image/public/ endpoint, so instead of shipping the full-resolution
 * original and letting the browser downscale it (which produces moire /
 * interference patterns), we ask for variants close to the real display size
 * and let the browser pick one via srcset/sizes.
 */

const STORAGE_OBJECT = '/storage/v1/object/public/'
const STORAGE_RENDER = '/storage/v1/render/image/public/'

export function isTransformable(url: string | null | undefined): boolean {
  return !!url && url.includes(STORAGE_OBJECT)
}

export function resizedImage(url: string, width: number, quality = 78): string {
  if (!isTransformable(url)) return url
  const base = url.replace(STORAGE_OBJECT, STORAGE_RENDER)
  return `${base}?width=${width}&height=${width}&resize=cover&quality=${quality}`
}

/**
 * Build a srcset of square variants for a product thumbnail.
 * Returns undefined when the URL cannot be transformed (external images).
 */
export function productSrcSet(
  url: string | null | undefined,
  widths: number[] = [200, 300, 400, 600, 800],
): string | undefined {
  if (!url || !isTransformable(url)) return undefined
  return widths.map(w => `${resizedImage(url, w)} ${w}w`).join(', ')
}

/** Default src for a thumbnail: a pre-sized variant, not the original. */
export function productThumb(url: string | null | undefined, width = 400): string | undefined {
  if (!url) return undefined
  return isTransformable(url) ? resizedImage(url, width) : url
}

/** `sizes` for a 2-up mobile / 4-up desktop product grid. */
export const GRID_SIZES = '(min-width: 1024px) 300px, (min-width: 768px) 25vw, 50vw'
