import { useEffect, useState } from 'react'
import { fetchPublicTable } from '@/lib/publicContent'

export interface SiteContentEntry {
  section_key: string
  title: string
  subtitle: string | null
  body: string
  image_url: string | null
}

type SiteContentMap = Record<string, SiteContentEntry>

let cachedContent: SiteContentMap | null = null
let pendingContent: Promise<SiteContentMap> | null = null
let cacheVersion = 0

function loadSiteContent(): Promise<SiteContentMap> {
  if (cachedContent) return Promise.resolve(cachedContent)
  if (pendingContent) return pendingContent

  const requestedVersion = cacheVersion
  pendingContent = fetchPublicTable<SiteContentEntry>(
    'site_content',
    'select=section_key,title,subtitle,body,image_url&limit=100',
  ).then(rows => {
    const next: SiteContentMap = Object.fromEntries(rows.map(row => [row.section_key, row]))
    if (requestedVersion === cacheVersion) cachedContent = next
    return next
  }).finally(() => {
    if (requestedVersion === cacheVersion) pendingContent = null
  })

  return pendingContent
}

export function invalidateSiteContentCache() {
  cacheVersion += 1
  cachedContent = null
  pendingContent = null
}

export function useSiteContent(sectionKey: string): SiteContentEntry | null {
  const [entry, setEntry] = useState<SiteContentEntry | null>(() => cachedContent?.[sectionKey] ?? null)

  useEffect(() => {
    let active = true
    if (cachedContent) {
      setEntry(cachedContent[sectionKey] ?? null)
      return () => { active = false }
    }

    setEntry(null)
    loadSiteContent().then(rows => {
      if (active) setEntry(rows[sectionKey] ?? null)
    }).catch(error => {
      if (active) console.warn(`Could not load Site Content section "${sectionKey}":`, error)
    })

    return () => { active = false }
  }, [sectionKey])

  return entry
}
