import { useMemo } from 'react'

const BOOKS_ORIGIN = 'https://ushangabooks-m4jy4icc.manus.space'

export default function BooksPortalPage() {
  const src = useMemo(() => {
    const pathname = window.location.pathname.replace(/^\/books/, '') || '/'
    const targetPath = `/books${pathname === '/' ? '/' : pathname}`
    const params = new URLSearchParams(window.location.search)
    if (!params.has('shareOrigin')) params.set('shareOrigin', window.location.origin)
    const query = params.toString()
    return `${BOOKS_ORIGIN}${targetPath}${query ? `?${query}` : ''}${window.location.hash}`
  }, [])

  return (
    <div className="w-full bg-[#211a17]" style={{ minHeight: '100vh' }}>
      <iframe
        title="Ushanga Books bookkeeping"
        src={src}
        allow="clipboard-write"
        className="block w-full border-0"
        style={{ minHeight: '100vh', height: '100vh' }}
      />
    </div>
  )
}
