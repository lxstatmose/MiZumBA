import { ChevronLeft, Sun, Moon, Globe, Monitor } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import type { Lang } from '../../i18n'

export default function AppearancePage() {
  const { setPage } = useAppStore()
  const { theme, setTheme, lang, setLang, t } = useSettingsStore()
  const isDesktop = useIsDesktop()

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.25rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {!isDesktop && (
          <button onClick={() => setPage('profile')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex' }}>
            <ChevronLeft size={24} />
          </button>
        )}
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>{t.appearanceSettings}</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* Theme */}
        <div style={{ marginBottom: '1rem' }}>
          <div className="section-label">{t.theme}</div>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
            <button
              onClick={() => setTheme('light')}
              style={{
                width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem',
                border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                background: theme === 'light' ? 'rgba(132,36,123,0.06)' : 'var(--surface)',
                transition: 'background var(--duration) var(--ease)',
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: '#f8f6fc', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sun size={20} color="#84247B" />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>{t.lightMode}</div>
              </div>
              {theme === 'light' && (
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'white', fontSize: '0.7rem', fontWeight: 700 }}>✓</span>
                </div>
              )}
            </button>

            <button
              onClick={() => setTheme('dark')}
              style={{
                width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem',
                border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                background: theme === 'dark' ? 'rgba(132,36,123,0.06)' : 'var(--surface)',
                transition: 'background var(--duration) var(--ease)',
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: '#1a1a2e', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Moon size={20} color="#8EEBF2" />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>{t.darkMode}</div>
              </div>
              {theme === 'dark' && (
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'white', fontSize: '0.7rem', fontWeight: 700 }}>✓</span>
                </div>
              )}
            </button>

            <button
              onClick={() => setTheme('system')}
              style={{
                width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem',
                border: 'none', cursor: 'pointer',
                background: theme === 'system' ? 'rgba(132,36,123,0.06)' : 'var(--surface)',
                transition: 'background var(--duration) var(--ease)',
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--bg)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Monitor size={20} color="var(--text-muted)" />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>{t.systemTheme}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{t.systemThemeDesc}</div>
              </div>
              {theme === 'system' && (
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'white', fontSize: '0.7rem', fontWeight: 700 }}>✓</span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Language */}
        <div>
          <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Globe size={12} /> {t.language}
          </div>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
            {([['en', t.langEnglish, '🇬🇧'], ['ru', t.langRussian, '🇷🇺']] as [Lang, string, string][]).map(([code, label, flag], i) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                style={{
                  width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem',
                  border: 'none', cursor: 'pointer', borderBottom: i === 0 ? '1px solid var(--border)' : 'none',
                  background: lang === code ? 'rgba(132,36,123,0.06)' : 'var(--surface)',
                  transition: 'background var(--duration) var(--ease)',
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>{flag}</span>
                <span style={{ flex: 1, textAlign: 'left', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', fontFamily: "'Baloo Da 2', sans-serif" }}>{label}</span>
                {lang === code && (
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'white', fontSize: '0.7rem', fontWeight: 700 }}>✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
