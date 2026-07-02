import { useState, useEffect } from 'react'
import { X, MessageCircle, Shield } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { getUserById, blockUser } from '../api/users'
import { createDirectChat } from '../api/chats'
import type { UserPublic } from '../types/api'

interface Props {
  userId: string
  onClose: () => void
}

export default function UserProfileCard({ userId, onClose }: Props) {
  const { setPage, setOpenChat } = useAppStore()
  const { t } = useSettingsStore()
  const [user, setUser] = useState<UserPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [blocking, setBlocking] = useState(false)
  const [messaging, setMessaging] = useState(false)

  useEffect(() => {
    getUserById(userId)
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  const handleMessage = async () => {
    if (messaging) return
    setMessaging(true)
    try {
      const chat = await createDirectChat(userId)
      onClose()
      setOpenChat(chat.id)
      setPage('chats')
    } catch { /* ignore */ }
    finally { setMessaging(false) }
  }

  const handleBlock = async () => {
    setBlocking(true)
    try {
      await blockUser(userId)
      onClose()
    } catch { /* ignore */ }
    finally { setBlocking(false) }
  }

  const initials = (name: string) =>
    name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 900,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 360,
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ position: 'relative', padding: '2rem 1.5rem 1rem', background: 'var(--gradient)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', border: 'none', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={14} />
          </button>
          {loading ? (
            <div className="skeleton" style={{ width: 72, height: 72, borderRadius: '50%', marginBottom: '0.75rem' }} />
          ) : user?.avatar_url ? (
            <img src={user.avatar_url} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.5)', marginBottom: '0.75rem' }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.5rem', marginBottom: '0.75rem' }}>
              {user ? initials(user.display_name) : '?'}
            </div>
          )}
          {loading ? (
            <>
              <div className="skeleton" style={{ height: 16, width: 120, marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 12, width: 80 }} />
            </>
          ) : (
            <>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'white', marginBottom: '0.2rem' }}>{user?.display_name}</div>
              {user?.username && <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)' }}>@{user.username}</div>}
              <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)' }}>
                {user?.is_online ? '🟢 ' + t.online : '⚫ ' + t.offline}
              </div>
            </>
          )}
        </div>

        {/* Bio */}
        {user?.bio && (
          <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {user.bio}
          </div>
        )}

        {/* Actions */}
        <div style={{ padding: '1rem', display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleMessage}
            disabled={messaging || loading}
            className="btn-primary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <MessageCircle size={16} />
            {messaging ? t.loading : t.sendMessage}
          </button>
          <button
            onClick={handleBlock}
            disabled={blocking || loading}
            style={{ border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {blocking ? <span className="spinner-primary" style={{ width: 16, height: 16 }} /> : <Shield size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
