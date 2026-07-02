import { useState, useEffect } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { getPrivacy, updatePrivacy } from '../../api/settings'
import type { PrivacySettings } from '../../api/settings'

export default function PrivacySettingsPage() {
  const { setPage } = useAppStore()
  const { t } = useSettingsStore()
  const isDesktop = useIsDesktop()
  const [settings, setSettings] = useState<PrivacySettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getPrivacy().then(setSettings).catch(() => {})
  }, [])

  const set = async (patch: Partial<PrivacySettings>) => {
    if (!settings) return
    setSaving(true)
    try {
      const updated = await updatePrivacy(patch)
      setSettings(updated)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.25rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {!isDesktop && (
          <button onClick={() => setPage('profile')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex' }}>
            <ChevronLeft size={24} />
          </button>
        )}
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>{t.privacySettings}</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {!settings ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t.loading}</div>
        ) : (
          <>
            {/* Who can message */}
            <div style={{ marginBottom: '1rem' }}>
              <div className="section-label">{t.whoCanMessage}</div>
              <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                {(['everyone', 'nobody'] as const).map((val, i) => (
                  <button
                    key={val}
                    onClick={() => set({ direct_messages: val })}
                    disabled={saving}
                    style={{
                      width: '100%', padding: '0.875rem 1rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      border: 'none', cursor: 'pointer',
                      borderBottom: i === 0 ? '1px solid var(--border)' : 'none',
                      background: settings.direct_messages === val ? 'rgba(132,36,123,0.06)' : 'var(--surface)',
                      transition: 'background var(--duration) var(--ease)',
                      fontFamily: "'Baloo Da 2', sans-serif",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>
                      {val === 'everyone' ? t.everyone : t.nobody}
                    </span>
                    {settings.direct_messages === val && (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'white', fontSize: '0.7rem', fontWeight: 700 }}>✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Online status */}
            <div>
              <div className="section-label">{t.showOnlineStatus}</div>
              <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>{t.showOnlineStatus}</span>
                  <button
                    className={`toggle-track ${settings.show_online_status ? 'on' : 'off'}`}
                    onClick={() => set({ show_online_status: !settings.show_online_status })}
                    disabled={saving}
                    style={{ opacity: saving ? 0.6 : 1 }}
                  >
                    <span className="toggle-thumb" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  )
}
