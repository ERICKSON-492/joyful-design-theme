import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Message {
  id: string
  customer_name: string
  message: string
  is_from_admin: boolean
  created_at: string
}

const CONV_KEY = 'uc-conversation-id'
const NAME_KEY = 'uc-customer-name'
const PHONE_KEY = 'uc-customer-phone'

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

  // Realtime subscribe
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
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, open])

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [open, messages])

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
          <div className="bg-primary text-primary-foreground p-4">
            <h3 className="font-display font-bold text-lg">Chat with Us</h3>
            <p className="text-xs opacity-90">We typically reply within minutes.</p>
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
                  <p
                    className={`text-[10px] mt-1 ${
                      m.is_from_admin ? 'text-muted-foreground' : 'text-primary-foreground/70'
                    }`}
                  >
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
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
                onChange={(e) => setDraft(e.target.value)}
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
            <a
              href="https://wa.me/254748207000"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-muted-foreground hover:text-primary"
            >
              Or chat on WhatsApp →
            </a>
          </form>
        </div>
      )}
    </>
  )
}