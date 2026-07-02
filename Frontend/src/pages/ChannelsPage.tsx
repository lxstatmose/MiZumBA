import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Plus, Hash, Users, ChevronLeft, Send, MoreVertical, Edit2, Trash2, X, Check } from 'lucide-react'
import CreateChatModal from '../components/CreateChatModal'
import type { Translations } from '../i18n/en'
import { listChannels, subscribeChannel, unsubscribeChannel, getChannelPosts, createPost, updateChannel, deleteChannel, editPost, deletePost, getChannel } from '../api/channels'
import type { ChannelSummary, ChannelPostPublic } from '../types/api'
import { useAppStore } from '../store/useAppStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useIsDesktop } from '../hooks/useIsDesktop'

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function formatTime(iso: string, t: Translations) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diff < 172_800_000) return t.yesterday
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

function channelEditDescription(channel: { title: string; description?: string | null }) {
  const desc = channel.description ?? ''
  return desc === channel.title ? '' : desc
}

/* ── Channel posts view ──────────────────────────────────────── */
function ChannelView({
  channel: initialChannel, onBack, isDesktop, onChannelDeleted,
}: {
  channel: ChannelSummary; onBack: () => void; isDesktop: boolean; onChannelDeleted: () => void
}) {
  const { user } = useAppStore()
  const { t } = useSettingsStore()
  const [channel, setChannel] = useState<ChannelSummary>(initialChannel)
  const [posts, setPosts] = useState<ChannelPostPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [postText, setPostText] = useState('')
  const [posting, setPosting] = useState(false)
  const [editingPost, setEditingPost] = useState<ChannelPostPublic | null>(null)
  const [editText, setEditText] = useState('')
  const [showChannelMenu, setShowChannelMenu] = useState(false)
  const [editingChannel, setEditingChannel] = useState(false)
  const [editChannelTitle, setEditChannelTitle] = useState(channel.title)
  const [editChannelDesc, setEditChannelDesc] = useState(() => channelEditDescription(channel))
  const [savingChannel, setSavingChannel] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const isOwner = channel.current_user_role === 'owner'
  const isAdmin = channel.current_user_role === 'admin' || isOwner

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
     
    setPosts([])
    getChannelPosts(channel.id)
      .then(setPosts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [channel.id])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [posts])

  useEffect(() => {
    if (!showChannelMenu) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowChannelMenu(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [showChannelMenu])

  const handlePost = async () => {
    if (!postText.trim() || posting) return
    const text = postText.trim()
    setPostText('')
    setPosting(true)
    try {
      const post = await createPost(channel.id, text)
      setPosts((prev) => [...prev, post])
    } catch { setPostText(text) }
    finally { setPosting(false) }
  }

  const handleEditPost = async (post: ChannelPostPublic) => {
    if (!editText.trim()) return
    try {
      const updated = await editPost(channel.id, post.id, editText.trim())
      setPosts((prev) => prev.map((p) => p.id === post.id ? updated : p))
      setEditingPost(null)
    } catch { /* ignore */ }
  }

  const handleDeletePost = async (post: ChannelPostPublic) => {
    if (!window.confirm(t.confirmDelete)) return
    try {
      await deletePost(channel.id, post.id)
      setPosts((prev) => prev.filter((p) => p.id !== post.id))
    } catch { /* ignore */ }
  }

  const handleEditChannel = async () => {
    setSavingChannel(true)
    try {
      const updated = await updateChannel(channel.id, {
        title: editChannelTitle.trim(),
        description: editChannelDesc.trim(),
      })
      setChannel({ ...channel, title: updated.title, description: updated.description })
      setEditingChannel(false)
    } catch { /* ignore */ }
    finally { setSavingChannel(false) }
  }

  const handleDeleteChannel = async () => {
    if (!window.confirm(t.confirmDelete)) return
    try {
      await deleteChannel(channel.id)
      onChannelDeleted()
    } catch (e) {
      alert(e instanceof Error ? e.message : t.deleteChannelFailed)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: '0.75rem 1rem', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {!isDesktop && (
          <button onClick={onBack} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex' }}>
            <ChevronLeft size={24} />
          </button>
        )}
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, overflow: 'hidden' }}>
          {channel.cover_url ? <img src={channel.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Hash size={18} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }} className="truncate">#{channel.title}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            {channel.subscribers_count.toLocaleString()} {t.subscribers}
          </div>
        </div>
        {isAdmin && (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button onClick={() => setShowChannelMenu((s) => !s)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
              <MoreVertical size={20} />
            </button>
            {showChannelMenu && (
              <div className="ctx-menu" style={{ right: 0, top: '100%' }}>
                <button className="ctx-item" onClick={() => { setEditingChannel(true); setEditChannelTitle(channel.title); setEditChannelDesc(channelEditDescription(channel)); setShowChannelMenu(false) }}>
                  <Edit2 size={14} /> {t.editChannelTitle}
                </button>
                {isOwner && (
                  <button className="ctx-item danger" onClick={() => { setShowChannelMenu(false); handleDeleteChannel() }}>
                    <Trash2 size={14} /> {t.deleteChannelBtn}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit channel form */}
      {editingChannel && (
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0.875rem 1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              className="input-field"
              value={editChannelTitle}
              onChange={(e) => setEditChannelTitle(e.target.value)}
              placeholder={t.channelName}
              style={{ flex: 1 }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input-field"
              value={editChannelDesc}
              onChange={(e) => setEditChannelDesc(e.target.value)}
              placeholder={t.descriptionOptional}
              style={{ flex: 1 }}
            />
            <button
              onClick={handleEditChannel}
              disabled={savingChannel}
              style={{ border: 'none', background: 'var(--gradient)', color: 'white', borderRadius: 'var(--radius-sm)', padding: '0 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600, fontSize: '0.8rem', fontFamily: "'Baloo Da 2', sans-serif" }}
            >
              <Check size={14} /> {savingChannel ? t.saving : t.save}
            </button>
            <button
              onClick={() => setEditingChannel(false)}
              style={{ border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)', padding: '0 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Posts */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>{t.loading}</div>}
        {!loading && posts.filter((p) => !p.deleted_at).length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><Hash size={28} color="var(--text-muted)" /></div>
            <span style={{ fontSize: '0.85rem' }}>{t.noPosts}</span>
          </div>
        )}
        {posts.filter((p) => !p.deleted_at).map((post) => {
          const canEdit = post.author_id === user?.id
          const canDelete = canEdit || isAdmin
          const isEditingThis = editingPost?.id === post.id

          return (
            <div key={post.id} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '1rem', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 700, overflow: 'hidden' }}>
                  {post.author?.avatar_url
                    ? <img src={post.author.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : initials(post.author?.display_name ?? 'A')
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text)' }}>{post.author?.display_name ?? 'Author'}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{formatTime(post.created_at, t)}{post.updated_at !== post.created_at && ` · ${t.edited}`}</div>
                </div>
                {(canEdit || canDelete) && (
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {canEdit && (
                      <button
                        onClick={() => { setEditingPost(post); setEditText(post.text) }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '0.25rem' }}
                        title={t.editPost}
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDeletePost(post)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', padding: '0.25rem' }}
                        title={t.deletePost}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              {post.image_url && (
                <img src={post.image_url} alt="" style={{ width: '100%', borderRadius: 'var(--radius-xs)', marginBottom: '0.5rem', maxHeight: 300, objectFit: 'cover' }} />
              )}
              {isEditingThis ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    className="input-field"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEditPost(post)}
                    style={{ flex: 1 }}
                    autoFocus
                  />
                  <button onClick={() => handleEditPost(post)} style={{ border: 'none', background: 'var(--gradient)', color: 'white', borderRadius: 'var(--radius-sm)', padding: '0 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditingPost(null)} style={{ border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)', padding: '0 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.55 }}>{post.text}</p>
              )}
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Post input (owners/admins only) */}
      {isAdmin && (
        <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '0.6rem 0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <div style={{ flex: 1, background: 'var(--input-bg)', borderRadius: 'var(--radius-full)', padding: '0.45rem 0.875rem' }}>
            <input className="input-bare" placeholder={t.writePost} value={postText} onChange={(e) => setPostText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handlePost()} />
          </div>
          <button className="voice-btn" onClick={handlePost} disabled={posting || !postText.trim()}>
            <Send size={18} />
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Channel list panel ──────────────────────────────────────── */
function ChannelListPanel({ onOpen, openChannelId, refreshTrigger }: { onOpen: (ch: ChannelSummary) => void; openChannelId: string | null; refreshTrigger?: number }) {
  const { t } = useSettingsStore()
  const [channels, setChannels] = useState<ChannelSummary[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(async (q?: string) => {
    setLoading(true)
    try {
      setChannels(await listChannels(q))
    } catch { /* silently fail */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load, refreshTrigger])
  useEffect(() => {
    const timeout = setTimeout(() => load(search || undefined), 400)
    return () => clearTimeout(timeout)
  }, [search, load])

  const toggle = async (ch: ChannelSummary, e: React.MouseEvent) => {
    e.stopPropagation()
    setToggling(ch.id)
    try {
      if (ch.is_subscribed) {
        await unsubscribeChannel(ch.id)
        setChannels((prev) => prev.map((c) => c.id === ch.id ? { ...c, is_subscribed: false, subscribers_count: c.subscribers_count - 1 } : c))
      } else {
        await subscribeChannel(ch.id)
        setChannels((prev) => prev.map((c) => c.id === ch.id ? { ...c, is_subscribed: true, subscribers_count: c.subscribers_count + 1 } : c))
      }
    } catch { /* silently fail */ }
    finally { setToggling(null) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      <div style={{ padding: '1rem 1rem 0.75rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>{t.channels}</h1>
          <button onClick={() => setShowModal(true)} style={{ border: 'none', background: 'var(--gradient)', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <Plus size={18} />
          </button>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input-field" placeholder={t.searchChannels} value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem', padding: '0.6rem 0.75rem 0.6rem 2.25rem', fontSize: '0.875rem' }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && (
          <div style={{ padding: '1rem' }}>
            {[1,2,3].map((i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', alignItems: 'center' }}>
                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 12, width: '70%' }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && channels.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><Hash size={28} color="var(--text-muted)" /></div>
            <span style={{ fontSize: '0.85rem' }}>{t.noChannelsFound}</span>
          </div>
        )}
        {channels.map((ch) => (
          <button
            key={ch.id}
            onClick={() => onOpen(ch)}
            style={{
              width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: openChannelId === ch.id ? 'rgba(132,36,123,0.06)' : 'var(--surface)',
              border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border)', textAlign: 'left',
              transition: 'background var(--duration) var(--ease)',
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, overflow: 'hidden' }}>
              {ch.cover_url ? <img src={ch.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Hash size={20} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }} className="truncate">#{ch.title}</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {ch.last_post ? formatTime(ch.last_post.created_at, useSettingsStore.getState().t) : ''}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Users size={10} /> {ch.subscribers_count.toLocaleString()} {t.subscribers}
              </div>
              <div className="truncate" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                {ch.last_post?.text ?? ch.description}
              </div>
            </div>
            <button
              onClick={(e) => toggle(ch, e)}
              disabled={toggling === ch.id}
              style={{
                flexShrink: 0, border: ch.is_subscribed ? '1.5px solid var(--primary)' : 'none',
                background: ch.is_subscribed ? 'var(--surface)' : 'var(--gradient)',
                color: ch.is_subscribed ? 'var(--primary)' : 'white',
                borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.65rem',
                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Baloo Da 2', sans-serif",
                opacity: toggling === ch.id ? 0.6 : 1,
              }}
            >
              {ch.is_subscribed ? t.leave : t.join}
            </button>
          </button>
        ))}
      </div>

      {showModal && <CreateChatModal onClose={() => { setShowModal(false); load() }} defaultMode="channel" />}
    </div>
  )
}

/* ── Main ChannelsPage ───────────────────────────────────────── */
export default function ChannelsPage() {
  const { openChannelId, setOpenChannel } = useAppStore()
  const { t } = useSettingsStore()
  const isDesktop = useIsDesktop()
  const [localChannel, setLocalChannel] = useState<ChannelSummary | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    if (!openChannelId) return
    if (localChannel?.id === openChannelId) return
    getChannel(openChannelId).then((ch) => setLocalChannel(ch as ChannelSummary)).catch(() => {})
  }, [openChannelId, localChannel?.id])

  const handleOpen = (ch: ChannelSummary) => {
    setLocalChannel(ch)
    setOpenChannel(ch.id)
  }

  const handleBack = () => {
    setLocalChannel(null)
    setOpenChannel(null)
  }

  const handleChannelDeleted = () => {
    setLocalChannel(null)
    setOpenChannel(null)
    setRefreshTrigger((n) => n + 1)
  }

  if (isDesktop) {
    return (
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid var(--border)' }}>
          <ChannelListPanel onOpen={handleOpen} openChannelId={openChannelId} refreshTrigger={refreshTrigger} />
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {localChannel ? (
            <ChannelView channel={localChannel} onBack={handleBack} isDesktop={true} onChannelDeleted={handleChannelDeleted} />
          ) : (
            <div className="empty-state" style={{ height: '100%' }}>
              <div className="empty-state-icon">
                <div style={{ background: 'var(--gradient)', borderRadius: 'var(--radius-full)', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Hash size={32} color="white" />
                </div>
              </div>
              <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)' }}>{t.selectChannel}</p>
              <p style={{ fontSize: '0.85rem' }}>{t.searchChannels}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (localChannel) {
    return <ChannelView channel={localChannel} onBack={handleBack} isDesktop={false} onChannelDeleted={handleChannelDeleted} />
  }

  return <ChannelListPanel onOpen={handleOpen} openChannelId={null} refreshTrigger={refreshTrigger} />
}
