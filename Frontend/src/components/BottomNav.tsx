import { MessageCircle, Hash, Bell, User } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useSettingsStore } from '../store/useSettingsStore'
import type { Page } from '../store/useAppStore'

const ITEMS: { page: Page; icon: (sz: number) => React.ReactNode; labelKey: 'chats' | 'channels' | 'activity' | 'profile' }[] = [
  { page: 'chats',    icon: (sz) => <MessageCircle size={sz} />, labelKey: 'chats' },
  { page: 'channels', icon: (sz) => <Hash size={sz} />,          labelKey: 'channels' },
  { page: 'activity', icon: (sz) => <Bell size={sz} />,          labelKey: 'activity' },
  { page: 'profile',  icon: (sz) => <User size={sz} />,          labelKey: 'profile' },
]

const MAIN_PAGES: Page[] = ['chats', 'channels', 'activity', 'profile']

export default function BottomNav() {
  const { page, setPage, unreadNotifications } = useAppStore()
  const { t } = useSettingsStore()

  const activePage = MAIN_PAGES.includes(page) ? page : 'profile'

  return (
    <nav className="nav-bar">
      {ITEMS.map((item) => {
        const active = activePage === item.page
        return (
          <button
            key={item.page}
            className="nav-item"
            style={{ border: 'none', background: 'transparent' }}
            onClick={() => setPage(item.page)}
            aria-label={t[item.labelKey]}
            aria-current={active ? 'page' : undefined}
          >
            {active && (
              <span style={{
                position: 'absolute', inset: 0,
                background: 'rgba(132, 36, 123, 0.08)',
                borderRadius: 'var(--radius-md)',
                animation: 'fadeIn 0.2s var(--ease) both',
              }} />
            )}

            <span style={{
              position: 'relative',
              color: active ? 'var(--primary)' : 'var(--text-muted)',
              transition: 'color var(--duration) var(--ease), transform var(--duration) var(--ease-spring)',
              transform: active ? 'scale(1.1)' : 'scale(1)',
              display: 'flex',
            }}>
              {item.icon(22)}
              {/* Bell badge */}
              {item.page === 'activity' && unreadNotifications > 0 && (
                <span className="nav-badge">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </span>

            <span style={{
              fontSize: '0.65rem',
              fontWeight: active ? 700 : 500,
              color: active ? 'var(--primary)' : 'var(--text-muted)',
              transition: 'color var(--duration) var(--ease)',
              position: 'relative',
            }}>
              {t[item.labelKey]}
            </span>

            {active && (
              <span style={{
                position: 'absolute', bottom: -2, left: '50%',
                transform: 'translateX(-50%)',
                width: 4, height: 4, borderRadius: '50%',
                background: 'var(--primary)',
                animation: 'fadeUp 0.2s var(--ease) both',
              }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}
