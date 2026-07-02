import { useState, useEffect, useCallback } from 'react'
import { Bell, CheckCheck, Trash2 } from 'lucide-react'
import type { Translations } from '../i18n/en'
import { listNotifications, markAllRead, deleteNotification, markNotificationRead } from '../api/notifications'
import { socket } from '../ws/socket'
import type { NotificationPublic } from '../types/api'
import { useAppStore } from '../store/useAppStore'
import { useSettingsStore } from '../store/useSettingsStore'


function formatTime(iso: string, t: Translations) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return t.justNow
  if (diff < 3_600_000) return t.minAgo(Math.floor(diff / 60_000))
  if (diff < 86_400_000) return t.hrAgo(Math.floor(diff / 3_600_000))
  if (diff < 172_800_000) return t.yesterday
  return t.daysAgo(Math.floor(diff / 86_400_000))
}

function groupByDate(items: NotificationPublic[]) {
  const today: NotificationPublic[] = []
  const yesterday: NotificationPublic[] = []
  const earlier: NotificationPublic[] = []
  const now = new Date()
  for (const n of items) {
    const diff = now.getTime() - new Date(n.created_at).getTime()
    if (diff < 86_400_000) today.push(n)
    else if (diff < 172_800_000) yesterday.push(n)
    else earlier.push(n)
  }
  return { today, yesterday, earlier }
}

function NotifItem({ item, onDelete, onRead, onNavigate, t }: {
  item: NotificationPublic
  onDelete: (id: string) => void
  onRead: (id: string) => void
  onNavigate: (item: NotificationPublic) => void
  t: Translations
}) {
  const name = item.actor?.display_name ?? 'MiZumBA'
  const av = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  const handleClick = () => {
    if (!item.is_read) onRead(item.id)
    onNavigate(item)
  }

  return (
    <div
      onClick={handleClick}
      style={{
        padding: '0.875rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
        background: item.is_read ? 'var(--surface)' : 'rgba(132,36,123,0.04)',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'background var(--duration) var(--ease)',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: item.is_read ? 'var(--input-bg)' : 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.is_read ? 'var(--text-muted)' : 'white', fontWeight: 700, fontSize: '0.8rem', overflow: 'hidden' }}>
          {item.actor?.avatar_url
            ? <img src={item.actor.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : av
          }
        </div>
        {!item.is_read && (
          <span style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)', border: '2px solid var(--surface)' }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.4 }}>
          <strong>{name}</strong> {item.body}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{formatTime(item.created_at, t)}</div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onDelete(item.id) }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '0.25rem', flexShrink: 0, opacity: 0.6 }}>
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function Group({ label, items, handleDelete, handleRead, handleNavigate, t }: {
  label: string
  items: NotificationPublic[]
  handleDelete: (id: string) => void
  handleRead: (id: string) => void
  handleNavigate: (item: NotificationPublic) => void
  t: Translations
}) {
  if (items.length === 0) return null
  return (
    <div>
      <div className="section-label" style={{ padding: '0.75rem 1rem 0.25rem' }}>{label}</div>
      {items.map((n) => <NotifItem key={n.id} item={n} onDelete={handleDelete} onRead={handleRead} onNavigate={handleNavigate} t={t} />)}
    </div>
  )
}

export default function ActivityPage() {
  const { setUnreadNotifications, setOpenChat, setOpenChannel, setPage } = useAppStore()
  const { t } = useSettingsStore()
  const [notifications, setNotifications] = useState<NotificationPublic[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await listNotifications()
      setNotifications(data.items)
      setUnreadCount(data.unread_count)
      setUnreadNotifications(data.unread_count)
    } catch { /* silently fail */ }
    finally { setLoading(false) }
  }, [setUnreadNotifications])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  useEffect(() => {
    const off = socket.on((ev) => {
      if (ev.type === 'notification.created') {
        const n = ev.payload.notification as NotificationPublic
        setNotifications((prev) => [n, ...prev])
        setUnreadCount((c) => { const next = c + 1; setUnreadNotifications(next); return next })
      }
    })
    return off
  }, [setUnreadNotifications])

  const handleMarkAll = async () => {
    await markAllRead().catch(() => {})
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
    setUnreadNotifications(0)
  }

  const handleRead = async (id: string) => {
    await markNotificationRead(id).catch(() => {})
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount((c) => { const next = Math.max(0, c - 1); setUnreadNotifications(next); return next })
  }

  const handleDelete = async (id: string) => {
    const target = notifications.find((n) => n.id === id)
    await deleteNotification(id).catch(() => {})
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    if (target && !target.is_read) {
      setUnreadCount((c) => { const next = Math.max(0, c - 1); setUnreadNotifications(next); return next })
    }
  }

  const handleNavigate = (item: NotificationPublic) => {
    const payload = item.payload as { chat_id?: string; channel_id?: string } | null
    if (payload?.chat_id) { setOpenChat(payload.chat_id); setPage('chats') }
    else if (payload?.channel_id) { setOpenChannel(payload.channel_id); setPage('channels') }
  }

  const { today, yesterday, earlier } = groupByDate(notifications)



  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1rem 0.75rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>{t.activity}</h1>
          {unreadCount > 0 && (
            <p style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, marginTop: '0.1rem' }}>
              {unreadCount === 1 ? t.newNotification : t.newNotifications(unreadCount)}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {unreadCount > 0 && (
            <button onClick={handleMarkAll} style={{ border: '1.5px solid var(--border-input)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.75rem', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary)', fontFamily: "'Baloo Da 2', sans-serif" }}>
              <CheckCheck size={14} /> {t.markAllRead}
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
        {loading && (
          <div style={{ padding: '1rem' }}>
            {[1,2,3].map((i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.875rem 1rem', alignItems: 'center' }}>
                <div className="skeleton" style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 14, width: '80%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 10, width: '30%' }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && notifications.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><Bell size={28} color="var(--text-muted)" /></div>
            <span style={{ fontSize: '0.85rem' }}>{t.noActivity}</span>
          </div>
        )}
        <Group label={t.today} items={today} handleDelete={handleDelete} handleRead={handleRead} handleNavigate={handleNavigate} t={t} />
        <Group label={t.yesterday} items={yesterday} handleDelete={handleDelete} handleRead={handleRead} handleNavigate={handleNavigate} t={t} />
        <Group label={t.earlier} items={earlier} handleDelete={handleDelete} handleRead={handleRead} handleNavigate={handleNavigate} t={t} />
        </div>
      </div>
    </div>
  )
}
