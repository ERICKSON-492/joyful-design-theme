/**
 * Expands a search term into simple singular/plural (and light stem) variants
 * so "belts" matches "belt", "necklace" matches "necklaces", etc.
 */
export function expandTerm(raw: string): string[] {
  const word = raw.toLowerCase().trim()
  if (!word) return []
  const out = new Set<string>([word])

  if (word.length > 3) {
    if (word.endsWith('ies')) out.add(word.slice(0, -3) + 'y')
    if (word.endsWith('es')) out.add(word.slice(0, -2))
    if (word.endsWith('s')) out.add(word.slice(0, -1))
    if (!word.endsWith('s')) {
      out.add(word + 's')
      if (/(s|x|z|ch|sh)$/.test(word)) out.add(word + 'es')
      if (word.endsWith('y')) out.add(word.slice(0, -1) + 'ies')
    }
  }

  return [...out].filter(w => w.length >= 2)
}

/** Expands a whole query into search variants (per word plus the full phrase). */
export function expandQuery(query: string): string[] {
  const cleaned = query.replace(/[%_*(),"']/g, ' ').replace(/\s+/g, ' ').trim()
  if (!cleaned) return []
  const variants = new Set<string>([cleaned])
  for (const word of cleaned.split(' ')) {
    for (const v of expandTerm(word)) variants.add(v)
  }
  return [...variants]
}
