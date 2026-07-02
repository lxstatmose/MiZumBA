import { useState, useEffect } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { getNotificationSettings, updateNotificationSettings } from '../../api/settings'
import type { NotificationSettings } from '../../api/settings'

export default function NotificationsSettingsPage() {
  const { setPage } = useAppStore()
  const { t } = useSettingsStore()
  const isDesktop = useIsDesktop()
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    getNotificationSettings().then(setSettings).catch(() => {})
  }, [])

  const toggle = async (key: keyof Omit<NotificationSettings, 'user_id' | 'updated_at'>) => {
    if (!settings) return
    const newVal = !settings[key]
    setSaving(key)
    try {
      const updated = await updateNotificationSettings({ [key]: newVal })
      setSettings(updated)
    } catch {
      /* revert on failure */
    } finally {
      setSaving(null)
    }
  }

  const rows: { key: keyof Omit<NotificationSettings, 'user_id' | 'updated_at'>; label: string }[] = [
    { key: 'new_messages',    label: t.notifMessages },
    { key: 'mentions',        label: t.notifMentions },
    { key: 'reactions',       label: t.notifReactions },
    { key: 'group_invites',   label: t.notifGroupInvites },
    { key: 'channel_updates', label: t.notifChannelUpdates },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.25rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {!isDesktop && (
          <button onClick={() => setPage('profile')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex' }}>
            <ChevronLeft size={24} />
          </button>
        )}
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>{t.notificationsSettings}</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {!settings ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t.loading}</div>
        ) : (
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
            {rows.map((row, i) => (
              <div key={row.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.875rem 1rem',
                borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>{row.label}</span>
                <button
                  className={`toggle-track ${settings[row.key] ? 'on' : 'off'}`}
                  onClick={() => toggle(row.key)}
                  disabled={saving === row.key}
                  style={{ opacity: saving === row.key ? 0.6 : 1 }}
                >
                  <span className="toggle-thumb" />
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
