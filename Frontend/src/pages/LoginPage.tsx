import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import Logo from '../components/Logo'
import { useAppStore } from '../store/useAppStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { login } from '../api/auth'
import { socket } from '../ws/socket'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const { setPage, setUser }    = useAppStore()
  const { t }                   = useSettingsStore()
  const isDesktop               = useIsDesktop()

  const handleLogin = async () => {
    if (!email || !password) { setError(t.allRequired); return }
    setError(null)
    setLoading(true)
    try {
      const data = await login(email, password)
      setUser(data.user)
      socket.connect()
      setPage('chats')
    } catch (e) {
      setError(e instanceof Error ? e.message : t.loginFailed)
    } finally {
      setLoading(false)
    }
  }

  const formBody = (
    <>
      {error && <div className="error-banner" style={{ marginBottom: '1rem' }}>{error}</div>}

      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>{t.email}</label>
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} autoComplete="email" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t.password}</label>
        <button style={{ border: 'none', background: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: "'Baloo Da 2', sans-serif", opacity: 0.85 }}>{t.forgotPassword}</button>
      </div>
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input className="input-field" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.passwordPlaceholder} style={{ paddingRight: '2.75rem' }} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} autoComplete="current-password" />
        <button onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <button className="btn-primary" onClick={handleLogin} disabled={loading}>
        {loading ? <span className="spinner" /> : t.signIn}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 500 }}>{t.orContinueWith}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button className="btn-social">
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>
          Google
        </button>
        <button className="btn-social">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><path d="M13.066 0c.072.96-.26 1.92-.856 2.613-.595.692-1.548 1.229-2.478 1.155-.096-.941.302-1.92.87-2.572C11.17.518 12.195.038 13.066 0zM16.92 12.6c-.48 1.056-1.056 2.016-1.92 2.976-.672.768-1.44 1.536-2.496 1.536-.96 0-1.248-.576-2.4-.576-1.152 0-1.536.576-2.4.576-1.056 0-1.824-.768-2.544-1.536C3.6 13.8 2.4 11.472 2.4 9.24c0-3.456 2.208-5.28 4.368-5.28 1.056 0 1.92.576 2.64.576.672 0 1.728-.672 2.976-.672 1.008 0 2.928.48 3.888 2.592C13.344 7.44 12.336 9.84 16.92 12.6z"/></svg>
          Apple
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        {t.noAccount}{' '}
        <button onClick={() => setPage('register')} style={{ border: 'none', background: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontFamily: "'Baloo Da 2', sans-serif" }}>
          {t.signUp}
        </button>
      </p>
    </>
  )

  /* ── Desktop: centered floating card ───────────────────────── */
  if (isDesktop) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-desktop)', padding: '2rem', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.55)', borderRadius: 'var(--radius-lg)', padding: '0.875rem', marginBottom: '0.75rem', backdropFilter: 'blur(12px)', boxShadow: '0 4px 24px rgba(132,36,123,0.12)' }}>
              <Logo size={52} />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.5px' }}>MiZumBA</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.25rem' }}>Connect. Collaborate. Thrive.</p>
          </div>
          <div className="card" style={{ borderRadius: 'var(--radius-xl)', padding: '2.5rem 2rem', boxShadow: '0 16px 48px rgba(132,36,123,0.15)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.3rem' }}>{t.welcomeBack}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{t.signInContinue}</p>
            {formBody}
          </div>
        </div>
      </div>
    )
  }

  /* ── Mobile: gradient header + bottom card ─────────────────── */
  return (
    <div style={{ minHeight: '100dvh' as string, display: 'flex', flexDirection: 'column' }} className="page-bg">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem 2rem' }}>
        <div className="fade-up" style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 'var(--radius-lg)', padding: '1rem', marginBottom: '1rem', backdropFilter: 'blur(12px)', boxShadow: '0 4px 24px rgba(132,36,123,0.12)' }}>
          <Logo size={56} />
        </div>
        <h1 className="fade-up" style={{ fontSize: '1.9rem', fontWeight: 800, color: 'white', letterSpacing: '-0.5px', textShadow: '0 2px 12px rgba(132,36,123,0.25)', animationDelay: '0.05s' }}>MiZumBA</h1>
        <p className="fade-up" style={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.88rem', marginTop: '0.2rem', animationDelay: '0.1s' }}>Connect. Collaborate. Thrive.</p>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="card fade-up" style={{ borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', padding: '2rem 1.5rem', flex: 1, animationDelay: '0.12s' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.3rem' }}>{t.welcomeBack}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{t.signInContinue}</p>
          {formBody}
        </div>
      </div>
    </div>
  )
}
