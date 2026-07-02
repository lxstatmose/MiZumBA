import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, MessageCircle, Hash, User } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { searchUsers } from '../api/users'
import { createDirectChat } from '../api/chats'
import type { SearchItem } from '../api/users'

interface Props {
  onClose: () => void
}

export default function SearchPanel({ onClose }: Props) {
  const { setPage, setOpenChat, setOpenChannel } = useAppStore()
  const { t } = useSettingsStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ users: SearchItem[]; chats: SearchItem[]; channels: SearchItem[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return }
    setLoading(true)
    try {
      const data = await searchUsers(q)
      setResults({ users: data.users, chats: data.chats, channels: data.channels })
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 350)
    return () => clearTimeout(t)
  }, [query, doSearch])

  const openUser = async (item: SearchItem) => {
    onClose()
    try {
      const chat = await createDirectChat(item.id)
      setOpenChat(chat.id)
      setPage('chats')
    } catch { /* ignore */ }
  }

  const openChat = (item: SearchItem) => {
    onClose()
    setOpenChat(item.id)
    setPage('chats')
  }

  const openChannel = (item: SearchItem) => {
    onClose()
    setOpenChannel(item.id)
    setPage('channels')
  }

  const hasResults = results && (results.users.length + results.chats.length + results.channels.length) > 0

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: '5vh',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 560,
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        overflow: 'hidden',
        margin: '0 1rem',
      }}>
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', gap: '0.75rem' }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            ref={inputRef}
            className="input-bare"
            placeholder={t.search + '…'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1, fontSize: '1rem' }}
          />
          {loading && <span className="spinner-primary" style={{ width: 16, height: 16 }} />}
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {!query && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {t.search}…
            </div>
          )}
          {query.length === 1 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {t.search}…
            </div>
          )}
          {query.length >= 2 && !loading && !hasResults && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {t.noUsersFound}
            </div>
          )}

          {results?.users && results.users.length > 0 && (
            <Section icon={<User size={14} />} label={t.profile} items={results.users} onSelect={openUser} />
          )}
          {results?.chats && results.chats.length > 0 && (
            <Section icon={<MessageCircle size={14} />} label={t.chats} items={results.chats} onSelect={openChat} />
          )}
          {results?.channels && results.channels.length > 0 && (
            <Section icon={<Hash size={14} />} label={t.channels} items={results.channels} onSelect={openChannel} />
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ icon, label, items, onSelect }: {
  icon: React.ReactNode; label: string; items: SearchItem[]; onSelect: (item: SearchItem) => void
}) {
  return (
    <div>
      <div style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg)' }}>
        {icon} {label}
      </div>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          style={{
            width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
            border: 'none', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left',
            borderBottom: '1px solid var(--border)', transition: 'background var(--duration) var(--ease)',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(132,36,123,0.05)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)' }}
        >
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
            {item.title.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }} className="truncate">{item.title}</div>
            {item.subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} className="truncate">{item.subtitle}</div>}
          </div>
        </button>
      ))}
    </div>
  )
}
