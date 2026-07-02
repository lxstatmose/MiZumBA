import { useEffect, useCallback, useState } from 'react'
import './index.css'
import { useAppStore } from './store/useAppStore'
import { useSettingsStore } from './store/useSettingsStore'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ChatsPage from './pages/ChatsPage'
import ChannelsPage from './pages/ChannelsPage'
import ActivityPage from './pages/ActivityPage'
import ProfilePage from './pages/ProfilePage'
import AppearancePage from './pages/settings/AppearancePage'
import NotificationsSettingsPage from './pages/settings/NotificationsSettingsPage'
import PrivacySettingsPage from './pages/settings/PrivacySettingsPage'
import BlockedUsersPage from './pages/settings/BlockedUsersPage'
import ChangePasswordPage from './pages/settings/ChangePasswordPage'
import BottomNav from './components/BottomNav'
import SearchPanel from './components/SearchPanel'
import { getTokens } from './api/client'
import { getMe } from './api/users'
import { socket } from './ws/socket'
import { listNotifications } from './api/notifications'
import { playNotificationSound } from './utils/sound'
import type { Page } from './store/useAppStore'
import { MessageCircle, Hash, Bell, User, Sun, Moon, Search } from 'lucide-react'
import { useIsDesktop } from './hooks/useIsDesktop'

const AUTH_PAGES: Page[] = ['login', 'register']
const MAIN_TABS: Page[] = ['chats', 'channels', 'activity', 'profile']

const NAV_ITEMS: { page: Page; icon: React.ReactNode; labelKey: 'chats' | 'channels' | 'activity' | 'profile' }[] = [
  { page: 'chats',    icon: <MessageCircle size={22} />, labelKey: 'chats' },
  { page: 'channels', icon: <Hash size={22} />,          labelKey: 'channels' },
  { page: 'activity', icon: <Bell size={22} />,          labelKey: 'activity' },
  { page: 'profile',  icon: <User size={22} />,          labelKey: 'profile' },
]

/* ── Favicon badge ───────────────────────────────────────────── */
function setFaviconBadge(count: number) {
  const canvas = document.createElement('canvas')
  canvas.width = 32; canvas.height = 32
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, 32, 32)
  ctx.beginPath()
  ctx.arc(16, 16, 14, 0, Math.PI * 2)
  ctx.fillStyle = '#84247B'
  ctx.fill()
  ctx.fillStyle = 'white'
  ctx.font = 'bold 14px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(count > 99 ? '99+' : 'M', 16, 16.5)
  if (count > 0) {
    ctx.beginPath()
    ctx.arc(26, 6, 8, 0, Math.PI * 2)
    ctx.fillStyle = '#ef4444'
    ctx.fill()
    ctx.fillStyle = 'white'
    ctx.font = 'bold 9px sans-serif'
    ctx.fillText(count > 9 ? '9+' : String(count), 26, 6.5)
  }
  let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = canvas.toDataURL()
}

function PageRenderer({ page }: { page: Page }) {
  switch (page) {
    case 'login':    return <LoginPage />
    case 'register': return <RegisterPage />
    case 'chats':    return <ChatsPage />
    case 'channels': return <ChannelsPage />
    case 'activity': return <ActivityPage />
    case 'profile':  return <ProfilePage />
    case 'settings-appearance':    return <AppearancePage />
    case 'settings-notifications': return <NotificationsSettingsPage />
    case 'settings-privacy':       return <PrivacySettingsPage />
    case 'settings-blocked':       return <BlockedUsersPage />
    case 'settings-password':      return <ChangePasswordPage />
  }
}

export default function App() {
  const { page, setPage, setUser, logout, unreadNotifications, totalChatUnread, setTotalChatUnread, openChatId } = useAppStore()
  const { t, theme, toggleTheme } = useSettingsStore()
  const isDesktop = useIsDesktop()
  const [showSearch, setShowSearch] = useState(false)

  const loadUnread = useCallback(async () => {
    try {
      const data = await listNotifications()
      useAppStore.getState().setUnreadNotifications(data.unread_count)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const { access } = getTokens()
    if (!access) return
    getMe()
      .then((user) => { setUser(user); socket.connect(); loadUnread() })
      .catch(() => logout())
  }, [setUser, logout, loadUnread])

  useEffect(() => {
    const off = socket.on((ev) => {
      if (ev.type === 'notification.created') {
        const cur = useAppStore.getState().unreadNotifications
        useAppStore.getState().setUnreadNotifications(cur + 1)
        playNotificationSound()
      }
      if (ev.type === 'message.created') {
        const msg = ev.payload.message as { chat_id: string }
        const currentChatId = useAppStore.getState().openChatId
        if (msg.chat_id !== currentChatId) {
          const cur = useAppStore.getState().totalChatUnread
          useAppStore.getState().setTotalChatUnread(cur + 1)
          playNotificationSound()
        }
      }
      if (ev.type === 'message.read') {
        useAppStore.getState().setTotalChatUnread(0)
      }
    })
    return off
  }, [])

  // Reset totalChatUnread when viewing a chat
  useEffect(() => {
    if (openChatId) setTotalChatUnread(0)
  }, [openChatId, setTotalChatUnread])

  // document.title & favicon badge
  const totalUnread = unreadNotifications + totalChatUnread
  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) MiZumBA` : 'MiZumBA'
    setFaviconBadge(totalUnread)
  }, [totalUnread])

  // Ctrl+K global search shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch((s) => !s)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const isAuthPage = AUTH_PAGES.includes(page)
  const activeTab = MAIN_TABS.includes(page) ? page : 'profile'

  /* ── Auth pages ─────────────────────────────────────────────── */
  if (isAuthPage) {
    return (
      <div style={{ height: '100dvh' as string, display: 'flex', flexDirection: 'column' }}>
        <div key={page} className="page-enter" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <PageRenderer page={page} />
        </div>
      </div>
    )
  }

  /* ── Mobile layout ──────────────────────────────────────────── */
  if (!isDesktop) {
    return (
      <div style={{
        maxWidth: 480,
        margin: '0 auto',
        height: '100dvh' as string,
        background: 'var(--bg)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}>
        <div key={page} className="page-enter" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <PageRenderer page={page} />
        </div>
        <BottomNav />
        {showSearch && <SearchPanel onClose={() => setShowSearch(false)} />}
      </div>
    )
  }

  /* ── Desktop layout ─────────────────────────────────────────── */
  return (
    <div style={{
      display: 'flex',
      height: '100dvh' as string,
      background: 'var(--bg)',
      overflow: 'hidden',
    }}>
      {/* Sidebar rail */}
      <nav className="sidebar-nav" style={{ width: 64 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 'var(--radius-md)',
          background: 'var(--gradient)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem',
        }}>
          <span style={{ color: 'white', fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.5px' }}>M</span>
        </div>

        {/* Search button */}
        <button
          className="sidebar-nav-item"
          onClick={() => setShowSearch(true)}
          title={t.search + ' (Ctrl+K)'}
          style={{ position: 'relative' }}
        >
          <span style={{ color: 'var(--text-muted)', display: 'flex', transition: 'color var(--duration) var(--ease)' }}>
            <Search size={20} />
          </span>
        </button>

        {NAV_ITEMS.map((item) => {
          const active = activeTab === item.page
          const badge = item.page === 'activity' ? unreadNotifications : item.page === 'chats' ? totalChatUnread : 0
          return (
            <button
              key={item.page}
              className={`sidebar-nav-item${active ? ' active' : ''}`}
              onClick={() => setPage(item.page)}
              title={t[item.labelKey]}
              style={{ position: 'relative' }}
            >
              <span style={{ color: active ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', transition: 'color var(--duration) var(--ease)' }}>
                {item.icon}
              </span>
              {badge > 0 && (
                <span className="nav-badge" style={{ top: 4, right: 4 }}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
              {active && (
                <span style={{ position: 'absolute', left: 0, top: '15%', height: '70%', width: 3, borderRadius: '0 3px 3px 0', background: 'var(--primary)' }} />
              )}
            </button>
          )
        })}

        <div style={{ flex: 1 }} />

        <button className="sidebar-nav-item" onClick={toggleTheme} title={theme === 'dark' ? t.lightMode : t.darkMode}>
          <span style={{ color: 'var(--text-muted)', display: 'flex' }}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </span>
        </button>
      </nav>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div key={page} className="page-enter" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <PageRenderer page={page} />
        </div>
      </div>

      {showSearch && <SearchPanel onClose={() => setShowSearch(false)} />}
    </div>
  )
}
