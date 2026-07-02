import { useState } from 'react'
import { ChevronLeft, Lock, Eye, EyeOff, Check } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { changePassword } from '../../api/auth'

const Field = ({ label, value, onChange, show, onToggle }: {
  label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void
}) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>{label}</label>
    <div style={{ position: 'relative' }}>
      <Lock size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
      <input
        className="input-field"
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
      />
      <button
        type="button"
        onClick={onToggle}
        style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  </div>
)


export default function ChangePasswordPage() {
  const { setPage } = useAppStore()
  const { t } = useSettingsStore()
  const isDesktop = useIsDesktop()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (next !== confirm) { setError(t.passwordMismatch); return }
    if (next.length < 8) { setError(t.minChars); return }
    setSaving(true)
    try {
      await changePassword(current, next)
      setSuccess(true)
      setCurrent(''); setNext(''); setConfirm('')
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.passwordChangeFailed)
    } finally {
      setSaving(false)
    }
  }


  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.25rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {!isDesktop && (
          <button onClick={() => setPage('profile')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex' }}>
            <ChevronLeft size={24} />
          </button>
        )}
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>{t.changePassword}</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1rem' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <form onSubmit={handleSubmit}>
            <Field label={t.currentPassword} value={current} onChange={setCurrent} show={showCurrent} onToggle={() => setShowCurrent((s) => !s)} />
            <Field label={t.newPassword} value={next} onChange={setNext} show={showNext} onToggle={() => setShowNext((s) => !s)} />
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>{t.confirmPassword}</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input-field"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#ef4444', marginBottom: '1rem' }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#22c55e', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={16} /> {t.passwordChanged}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !current || !next || !confirm}
              className="btn-primary"
              style={{ width: '100%' }}
            >
              {saving ? t.saving : t.save}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
