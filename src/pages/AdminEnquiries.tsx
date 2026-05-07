import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Send, MessageSquare, ExternalLink } from 'lucide-react'

interface Message {
  id: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  message: string
  is_from_admin: boolean
  conversation_id: string
  is_read: boolean
  created_at: string
}

interface Conversation {
  conversation_id: string
  customer_name: string
  customer_email: string | null
  last_message: string
  last_time: string
  unread: number
}

export default function AdminEnquiries() {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const lastTypingSentRef = useRef(0)

  const fetchMessages = async () => {
    const { data } = await supabase.from('enquiry_messages').select('*').order('created_at', { ascending: true })
    if (data) {
      setMessages(data)
      // Group by conversation
      const convMap: Record<string, Conversation> = {}
      data.forEach(m => {
        if (!convMap[m.conversation_id]) {
          convMap[m.conversation_id] = {
            conversation_id: m.conversation_id,
            customer_name: m.customer_name,
            customer_email: m.customer_email,
            last_message: m.message,
            last_time: m.created_at,
            unread: 0,
          }
        }
        convMap[m.conversation_id].last_message = m.message
        convMap[m.conversation_id].last_time = m.created_at
        if (!m.is_read && !m.is_from_admin) convMap[m.conversation_id].unread++
      })
      const sorted = Object.values(convMap).sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime())
      setConversations(sorted)
    }
  }

  useEffect(() => { fetchMessages() }, [])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('enquiries-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enquiry_messages' }, () => {
        fetchMessages()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // Broadcast channel per selected conversation (for typing indicator -> customer)
  useEffect(() => {
    if (!selectedConv) return
    const channel = supabase.channel(`chat-${selectedConv}`)
    channel.subscribe()
    typingChannelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
      typingChannelRef.current = null
    }
  }, [selectedConv])

  const broadcastAdminTyping = () => {
    if (!typingChannelRef.current) return
    const now = Date.now()
    if (now - lastTypingSentRef.current < 1500) return
    lastTypingSentRef.current = now
    typingChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { from: 'admin' },
    })
  }

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, selectedConv])

  // Mark as read
  useEffect(() => {
    if (selectedConv) {
      supabase.from('enquiry_messages')
        .update({ is_read: true })
        .eq('conversation_id', selectedConv)
        .eq('is_from_admin', false)
        .then(() => fetchMessages())
    }
  }, [selectedConv])

  const convMessages = messages.filter(m => m.conversation_id === selectedConv)
  const selectedConvData = conversations.find(c => c.conversation_id === selectedConv)
  const customerPhone = convMessages.find(m => !m.is_from_admin && m.customer_phone)?.customer_phone || null

  const openWhatsApp = () => {
    if (!customerPhone) {
      toast.error('No phone number on file for this customer.')
      return
    }
    const cleaned = customerPhone.replace(/[^\d]/g, '')
    const text = reply.trim() || `Hi ${selectedConvData?.customer_name || ''}, this is Ushanga Chronicles following up on your enquiry.`
    window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim() || !selectedConv || !selectedConvData) return
    setSending(true)
    const { error } = await supabase.from('enquiry_messages').insert({
      conversation_id: selectedConv,
      customer_name: 'Admin',
      customer_email: null,
      message: reply.trim(),
      is_from_admin: true,
    })
    if (error) toast.error(error.message)
    else { setReply(''); fetchMessages() }
    setSending(false)
  }

  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">Customer Enquiries</h1>
      <div className="flex bg-card border border-border rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
        {/* Conversation List */}
        <div className="w-72 border-r border-border overflow-y-auto shrink-0 hidden md:block">
          {conversations.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground text-center">No enquiries yet</p>
          )}
          {conversations.map(c => (
            <button
              key={c.conversation_id}
              onClick={() => setSelectedConv(c.conversation_id)}
              className={`w-full text-left p-4 border-b border-border hover:bg-accent transition-colors ${
                selectedConv === c.conversation_id ? 'bg-accent' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">{c.customer_name}</span>
                {c.unread > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">{c.unread}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-1">{c.last_message}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{new Date(c.last_time).toLocaleString()}</p>
            </button>
          ))}
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConv ? (
            <>
              <div className="p-4 border-b border-border bg-card flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">{selectedConvData?.customer_name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {customerPhone || selectedConvData?.customer_email || 'No contact info'}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={openWhatsApp}
                  disabled={!customerPhone}
                  className="bg-[#25D366] hover:bg-[#20BD5A] text-white shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1" /> WhatsApp
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {convMessages.map(m => (
                  <div key={m.id} className={`flex ${m.is_from_admin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                      m.is_from_admin
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    }`}>
                      <p>{m.message}</p>
                      <p className={`text-[10px] mt-1 ${m.is_from_admin ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {new Date(m.created_at).toLocaleTimeString()}
                        {m.is_from_admin && (m.is_read ? ' · Read' : ' · Sent')}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleReply} className="p-4 border-t border-border flex gap-2">
                <Input
                  value={reply}
                  onChange={e => { setReply(e.target.value); broadcastAdminTyping() }}
                  placeholder="Type your reply..."
                  className="flex-1"
                />
                <Button type="submit" disabled={sending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Select a conversation to start chatting</p>
              {/* Mobile conversation list */}
              <div className="md:hidden w-full mt-4 px-4 space-y-2">
                {conversations.map(c => (
                  <button
                    key={c.conversation_id}
                    onClick={() => setSelectedConv(c.conversation_id)}
                    className="w-full text-left p-3 bg-card border border-border rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground">{c.customer_name}</span>
                      {c.unread > 0 && (
                        <span className="bg-primary text-primary-foreground text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">{c.unread}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">{c.last_message}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
