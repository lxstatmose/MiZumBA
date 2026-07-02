import { useState, useEffect } from 'react'
import { ChevronLeft, UserX } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { getBlockedUsers, unblockUser } from '../../api/settings'
import type { BlockedUser } from '../../api/settings'

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function fmtDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function BlockedUsersPage() {
  const { setPage } = useAppStore()
  const { t, lang } = useSettingsStore()
  const isDesktop = useIsDesktop()
  const [blocked, setBlocked] = useState<BlockedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [unblocking, setUnblocking] = useState<string | null>(null)

  useEffect(() => {
    getBlockedUsers().then(setBlocked).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleUnblock = async (userId: string) => {
    setUnblocking(userId)
    try {
      await unblockUser(userId)
      setBlocked((prev) => prev.filter((b) => b.blocked_user.id !== userId))
    } catch { /* ignore */ }
    finally { setUnblocking(null) }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.25rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {!isDesktop && (
          <button onClick={() => setPage('profile')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex' }}>
            <ChevronLeft size={24} />
          </button>
        )}
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>{t.blockedUsers}</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t.loading}</div>
        )}
        {!loading && blocked.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><UserX size={32} color="var(--text-muted)" /></div>
            <span style={{ fontSize: '0.9rem' }}>{t.noBlockedUsers}</span>
          </div>
        )}
        {blocked.length > 0 && (
          <div style={{ background: 'var(--surface)', margin: '1rem', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
            {blocked.map((item, i) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1rem', borderBottom: i < blocked.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)', flexShrink: 0, overflow: 'hidden' }}>
                  {item.blocked_user.avatar_url
                    ? <img src={item.blocked_user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : initials(item.blocked_user.display_name)
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{item.blocked_user.display_name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {t.blockedOn} {fmtDate(item.created_at, lang)}
                  </div>
                </div>
                <button
                  onClick={() => handleUnblock(item.blocked_user.id)}
                  disabled={unblocking === item.blocked_user.id}
                  style={{ border: '1.5px solid var(--danger)', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.75rem', background: 'var(--surface)', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 700, fontFamily: "'Baloo Da 2', sans-serif", opacity: unblocking === item.blocked_user.id ? 0.6 : 1 }}
                >
                  {t.unblock}
                </button>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
