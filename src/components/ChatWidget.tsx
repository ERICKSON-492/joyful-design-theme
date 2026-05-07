import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, Check, CheckCheck } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Message {
  id: string
  customer_name: string
  message: string
  is_from_admin: boolean
  is_read: boolean
  created_at: string
}

const CONV_KEY = 'uc-conversation-id'
const NAME_KEY = 'uc-customer-name'
const PHONE_KEY = 'uc-customer-phone'
const WHATSAPP_NUMBER = '254748207000'

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) || '')
  const [phone, setPhone] = useState(() => localStorage.getItem(PHONE_KEY) || '')
  const [conversationId, setConversationId] = useState<string | null>(
    () => localStorage.getItem(CONV_KEY)
  )
  const [sending, setSending] = useState(false)
  const [unread, setUnread] = useState(0)
  const [adminTyping, setAdminTyping] = useState(false)
  const typingTimeoutRef = useRef<number | null>(null)
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const lastTypingSentRef = useRef(0)
  const endRef = useRef<HTMLDivElement>(null)

  // Load existing conversation
  useEffect(() => {
    if (!conversationId) return
    supabase
      .from('enquiry_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as Message[])
      })
  }, [conversationId])

  // Realtime subscribe (DB inserts + updates + typing broadcast)
  useEffect(() => {
    if (!conversationId) return
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'enquiry_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as Message
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
          if (m.is_from_admin && !open) setUnread((n) => n + 1)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'enquiry_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as Message
          setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)))
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        if ((payload.payload as any)?.from === 'admin') {
          setAdminTyping(true)
          if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = window.setTimeout(() => setAdminTyping(false), 3000)
        }
      })
      .subscribe()
    broadcastChannelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
      broadcastChannelRef.current = null
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current)
    }
  }, [conversationId, open])

  // Mark admin messages as read when widget is open
  useEffect(() => {
    if (!open || !conversationId) return
    const unreadAdmin = messages.filter((m) => m.is_from_admin && !m.is_read)
    if (unreadAdmin.length === 0) return
    supabase
      .from('enquiry_messages')
      .update({ is_read: true })
      .in('id', unreadAdmin.map((m) => m.id))
      .then(() => {
        setMessages((prev) =>
          prev.map((m) => (m.is_from_admin && !m.is_read ? { ...m, is_read: true } : m))
        )
      })
  }, [open, messages, conversationId])

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [open, messages, adminTyping])

  const broadcastTyping = () => {
    if (!broadcastChannelRef.current) return
    const now = Date.now()
    if (now - lastTypingSentRef.current < 1500) return
    lastTypingSentRef.current = now
    broadcastChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { from: 'customer' },
    })
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim() || !name.trim()) return
    setSending(true)
    localStorage.setItem(NAME_KEY, name.trim())
    if (phone.trim()) localStorage.setItem(PHONE_KEY, phone.trim())
    let convId = conversationId
    if (!convId) {
      convId = crypto.randomUUID()
      localStorage.setItem(CONV_KEY, convId)
      setConversationId(convId)
    }
    const { error } = await supabase.from('enquiry_messages').insert({
      conversation_id: convId,
      customer_name: name.trim(),
      customer_phone: phone.trim() || null,
      message: draft.trim(),
      is_from_admin: false,
    })
    if (!error) setDraft('')
    setSending(false)
  }

  const openWhatsApp = () => {
    const text = draft.trim() || `Hi! I'm ${name || 'a customer'} from Ushanga Chronicles website.`
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open chat"
        className="fixed right-6 bottom-6 z-50 bg-primary hover:bg-primary/90 text-primary-foreground p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
        style={{ minWidth: 56, minHeight: 56 }}
      >
        {open ? <X className="w-7 h-7" /> : <MessageCircle className="w-7 h-7" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed right-4 bottom-24 z-50 w-[calc(100vw-2rem)] sm:w-96 max-h-[70vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-primary text-primary-foreground p-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display font-bold text-lg">Chat with Us</h3>
              <p className="text-xs opacity-90">We typically reply within minutes.</p>
            </div>
            <button
              onClick={openWhatsApp}
              aria-label="Continue on WhatsApp"
              className="shrink-0 inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20BD5A] text-white text-xs font-semibold px-3 py-2 rounded-full transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                <path d="M20.52 3.48A11.93 11.93 0 0 0 12.04 0C5.5 0 .2 5.3.2 11.84c0 2.09.55 4.12 1.6 5.92L0 24l6.42-1.69a11.83 11.83 0 0 0 5.62 1.43h.01c6.54 0 11.84-5.3 11.84-11.84 0-3.16-1.23-6.13-3.37-8.42ZM12.05 21.3h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.21-3.81 1 1.02-3.71-.23-.38a9.46 9.46 0 0 1-1.45-5.04c0-5.23 4.26-9.49 9.49-9.49 2.53 0 4.92.99 6.71 2.78a9.43 9.43 0 0 1 2.78 6.71c0 5.23-4.26 9.49-9.49 9.49Zm5.2-7.1c-.28-.14-1.69-.83-1.95-.93-.26-.1-.45-.14-.64.14-.19.28-.74.93-.91 1.12-.17.19-.34.21-.62.07-.28-.14-1.2-.44-2.28-1.4-.84-.75-1.41-1.67-1.58-1.95-.17-.28-.02-.43.12-.57.13-.13.28-.34.42-.51.14-.17.19-.28.28-.47.1-.19.05-.35-.02-.49-.07-.14-.64-1.55-.88-2.13-.23-.55-.47-.48-.64-.49l-.55-.01c-.19 0-.49.07-.74.35s-.97.95-.97 2.32.99 2.7 1.13 2.88c.14.19 1.96 2.99 4.74 4.19.66.29 1.18.46 1.58.59.66.21 1.27.18 1.74.11.53-.08 1.69-.69 1.93-1.36.24-.66.24-1.23.17-1.36-.07-.13-.26-.21-.55-.35Z" />
              </svg>
              WhatsApp
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background min-h-[200px]">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">
                👋 Karibu! Send a message and our team will reply here.
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.is_from_admin ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                    m.is_from_admin
                      ? 'bg-muted text-foreground rounded-bl-sm'
                      : 'bg-primary text-primary-foreground rounded-br-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.message}</p>
                  <div
                    className={`flex items-center gap-1 mt-1 text-[10px] ${
                      m.is_from_admin ? 'text-muted-foreground' : 'text-primary-foreground/70 justify-end'
                    }`}
                  >
                    <span>
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {!m.is_from_admin && (
                      m.is_read ? (
                        <CheckCheck className="w-3.5 h-3.5" aria-label="Read" />
                      ) : (
                        <Check className="w-3.5 h-3.5" aria-label="Sent" />
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
            {adminTyping && (
              <div className="flex justify-start">
                <div className="bg-muted text-foreground rounded-2xl rounded-bl-sm px-3 py-2 text-sm">
                  <span className="inline-flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
                  </span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={send} className="border-t border-border p-3 space-y-2 bg-card">
            {!conversationId && (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name *"
                  required
                  className="text-sm"
                />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  className="text-sm"
                />
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value)
                  broadcastTyping()
                }}
                placeholder="Type a message..."
                className="flex-1 text-sm"
                required
              />
              <Button
                type="submit"
                size="icon"
                disabled={sending || !draft.trim() || !name.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <button
              type="button"
              onClick={openWhatsApp}
              className="block w-full text-center text-xs text-muted-foreground hover:text-primary"
            >
              Or continue this chat on WhatsApp →
            </button>
          </form>
        </div>
      )}
    </>
  )
}