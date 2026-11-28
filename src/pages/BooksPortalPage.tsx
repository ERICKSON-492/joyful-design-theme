import { useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'

const BOOKS_ORIGIN = 'https://ushangabooks-m4jy4icc.manus.space'

export default function BooksPortalPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const src = useMemo(() => {
    const pathname = window.location.pathname.replace(/^\/books/, '') || '/'
    const targetPath = `/books${pathname === '/' ? '/' : pathname}`
    const params = new URLSearchParams(window.location.search)
    if (!params.has('shareOrigin')) params.set('shareOrigin', window.location.origin)
    const query = params.toString()
    return `${BOOKS_ORIGIN}${targetPath}${query ? `?${query}` : ''}${window.location.hash}`
  }, [])

  useEffect(() => {
    const sendSession = async (target: Window | null) => {
      if (!target) return
      const { data } = await supabase.auth.getSession()
      target.postMessage({
        type: 'ushanga-books:auth',
        accessToken: data.session?.access_token ?? null,
      }, BOOKS_ORIGIN)
    }

    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== BOOKS_ORIGIN || event.source !== iframeRef.current?.contentWindow) return
      if (event.data?.type === 'ushanga-books:ready') {
        await sendSession(event.source as Window)
      } else if (event.data?.type === 'ushanga-books:login') {
        window.location.assign('/auth?return_to=%2Fbooks%2F')
      } else if (event.data?.type === 'ushanga-books:logout') {
        await supabase.auth.signOut()
        await sendSession(event.source as Window)
      }
    }

    window.addEventListener('message', onMessage)
    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => {
        void sendSession(iframeRef.current?.contentWindow ?? null)
      }, 0)
    })
    return () => {
      window.removeEventListener('message', onMessage)
      subscription.subscription.unsubscribe()
    }
  }, [])

  const handleLoad = () => {
    void (async () => {
      const { data } = await supabase.auth.getSession()
      iframeRef.current?.contentWindow?.postMessage({
        type: 'ushanga-books:auth',
        accessToken: data.session?.access_token ?? null,
      }, BOOKS_ORIGIN)
    })()
  }

  return (
    <div className="w-full bg-[#211a17]" style={{ minHeight: '100vh' }}>
      <iframe
        ref={iframeRef}
        title="Ushanga Books bookkeeping"
        src={src}
        onLoad={handleLoad}
        allow="clipboard-write"
        className="block w-full border-0"
        style={{ minHeight: '100vh', height: '100vh' }}
      />
    </div>
  )
}
