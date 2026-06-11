import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Plus, Trash2, Edit2, Save, X, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

interface Post {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  cover_image_url: string | null
  author: string | null
  is_published: boolean
  published_at: string | null
  created_at: string
}

const empty: Partial<Post> = {
  title: '', slug: '', excerpt: '', content: '', cover_image_url: '', author: 'Ushanga Chronicles',
  is_published: false,
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
}

export default function AdminChronicle() {
  const [posts, setPosts] = useState<Post[]>([])
  const [editing, setEditing] = useState<Partial<Post> | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data } = await (supabase as any).from('chronicle_posts').select('*').order('created_at', { ascending: false })
    setPosts(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!editing) return
    if (!editing.title?.trim()) { toast.error('Title required'); return }
    const payload: any = {
      title: editing.title.trim(),
      slug: editing.slug?.trim() || slugify(editing.title),
      excerpt: editing.excerpt || null,
      content: editing.content || null,
      cover_image_url: editing.cover_image_url || null,
      author: editing.author || 'Ushanga Chronicles',
      is_published: !!editing.is_published,
      published_at: editing.is_published ? (editing.published_at || new Date().toISOString()) : null,
    }
    const op = editing.id
      ? (supabase as any).from('chronicle_posts').update(payload).eq('id', editing.id)
      : (supabase as any).from('chronicle_posts').insert(payload)
    const { error } = await op
    if (error) { toast.error(error.message); return }
    toast.success(editing.id ? 'Post updated' : 'Post created')
    setEditing(null); load()
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this post?')) return
    const { error } = await (supabase as any).from('chronicle_posts').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Deleted'); load()
  }

  const togglePublish = async (p: Post) => {
    const next = !p.is_published
    const { error } = await (supabase as any).from('chronicle_posts')
      .update({ is_published: next, published_at: next ? (p.published_at || new Date().toISOString()) : null })
      .eq('id', p.id)
    if (error) { toast.error(error.message); return }
    toast.success(next ? 'Published — will be in the next digest' : 'Unpublished')
    load()
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">The Chronicle</h1>
          <p className="text-sm text-muted-foreground mt-1">Posts published here are automatically included in the daily newsletter digest.</p>
        </div>
        <button onClick={() => setEditing({ ...empty })}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Post
        </button>
      </div>

      {editing && (
        <div className="bg-card border border-border rounded-lg p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">{editing.id ? 'Edit Post' : 'New Post'}</h2>
            <button onClick={() => setEditing(null)} className="p-1.5 hover:bg-accent rounded-md"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Title">
              <input value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value, slug: editing.slug || slugify(e.target.value) })}
                className="w-full border border-border rounded-md px-3 py-2 bg-background text-sm" />
            </Field>
            <Field label="Slug (URL)">
              <input value={editing.slug || ''} onChange={e => setEditing({ ...editing, slug: slugify(e.target.value) })}
                className="w-full border border-border rounded-md px-3 py-2 bg-background text-sm font-mono" />
            </Field>
            <Field label="Cover image URL">
              <input value={editing.cover_image_url || ''} onChange={e => setEditing({ ...editing, cover_image_url: e.target.value })}
                className="w-full border border-border rounded-md px-3 py-2 bg-background text-sm" placeholder="https://..." />
            </Field>
            <Field label="Author">
              <input value={editing.author || ''} onChange={e => setEditing({ ...editing, author: e.target.value })}
                className="w-full border border-border rounded-md px-3 py-2 bg-background text-sm" />
            </Field>
          </div>
          <Field label="Excerpt (shown in digest email)">
            <textarea value={editing.excerpt || ''} onChange={e => setEditing({ ...editing, excerpt: e.target.value })}
              rows={2} maxLength={300}
              className="w-full border border-border rounded-md px-3 py-2 bg-background text-sm" />
          </Field>
          <Field label="Content (Markdown / plain text)">
            <textarea value={editing.content || ''} onChange={e => setEditing({ ...editing, content: e.target.value })}
              rows={8} className="w-full border border-border rounded-md px-3 py-2 bg-background text-sm font-mono" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!editing.is_published} onChange={e => setEditing({ ...editing, is_published: e.target.checked })} />
            Publish now (will appear in next daily digest)
          </label>
          <div className="flex gap-2">
            <button onClick={save} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold">
              <Save className="w-4 h-4" /> Save
            </button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 border border-border rounded-md text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Published</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
            ) : posts.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No posts yet</td></tr>
            ) : posts.map(p => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium text-foreground">{p.title}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${p.is_published ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                    {p.is_published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{p.published_at ? new Date(p.published_at).toLocaleString() : '—'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <button onClick={() => togglePublish(p)} className="p-2 hover:bg-accent rounded-md" title={p.is_published ? 'Unpublish' : 'Publish'}>
                      {p.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setEditing(p)} className="p-2 hover:bg-accent rounded-md"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => remove(p.id)} className="p-2 hover:bg-accent rounded-md text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}