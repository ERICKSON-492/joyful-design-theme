/** Shared URL-slug helper so nav links and shop filters always agree. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Legacy slug form (spaces only) kept so older links keep working. */
export function legacySlug(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-')
}
