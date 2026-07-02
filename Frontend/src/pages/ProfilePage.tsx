import { useState, useEffect, useRef } from 'react'
import { ChevronRight, Bell, Shield, Palette, Camera, Pencil, LogOut, X, Check, UserX, Lock } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { getMyProfile } from '../api/users'
import { updateMe } from '../api/users'
import { uploadAvatar } from '../api/files'
import { logout as apiLogout } from '../api/auth'
import { socket } from '../ws/socket'
import type { ProfileStats } from '../types/api'
export default function ProfilePage() {
  const { user, setUser, setPage, logout } = useAppStore()
  const { t } = useSettingsStore()
  const [stats, setStats] = useState<ProfileStats>({ messages_count: 0, groups_count: 0, channels_count: 0 })
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getMyProfile().then((data) => {
      setUser(data.user)
      setStats(data.stats)
    }).catch(() => {})
  }, [setUser])

  const startEdit = () => {
    setDisplayName(user?.display_name ?? '')
    setUsername(user?.username ?? '')
    setBio(user?.bio ?? '')
    setEditing(true)
  }

  const cancelEdit = () => setEditing(false)

  const saveEdit = async () => {
    setSaving(true)
    try {
      const updated = await updateMe({
        display_name: displayName.trim() || undefined,
        username: username.trim() || undefined,
        bio: bio.trim() || undefined,
      })
      setUser(updated)
      setEditing(false)
    } catch { /* silently fail */ }
    finally { setSaving(false) }
  }

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setAvatarUploading(true)
    try {
      const updated = await uploadAvatar(file)
      setUser(updated)
    } catch { /* silently fail */ }
    finally { setAvatarUploading(false) }
  }

  const handleLogout = async () => {
    await apiLogout()
    socket.disconnect()
    logout()
  }

  const avatarLetters = user?.display_name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'

  const SETTINGS_ITEMS = [
    { icon: <Bell size={18} color="white" />, bg: '#4fc3f7', label: t.notificationsSettings, desc: t.notificationsDesc, page: 'settings-notifications' as const },
    { icon: <Shield size={18} color="white" />, bg: '#84247B', label: t.privacySettings, desc: t.privacyDesc, page: 'settings-privacy' as const },
    { icon: <Palette size={18} color="white" />, bg: '#7c4dff', label: t.appearanceSettings, desc: t.appearanceDesc, page: 'settings-appearance' as const },
    { icon: <UserX size={18} color="white" />, bg: '#e53935', label: t.blockedUsers, desc: t.blockedDesc, page: 'settings-blocked' as const },
    { icon: <Lock size={18} color="white" />, bg: '#f59e0b', label: t.changePassword, desc: t.changePasswordDesc, page: 'settings-password' as const },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1rem 0', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>{t.profile}</h1>
        {!editing ? (
          <button onClick={startEdit} style={{ border: '1.5px solid var(--border)', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', cursor: 'pointer', color: 'var(--primary)' }}>
            <Pencil size={15} />
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={cancelEdit} style={{ border: '1.5px solid var(--border)', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={15} />
            </button>
            <button onClick={saveEdit} disabled={saving} style={{ border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gradient)', cursor: 'pointer', color: 'white', opacity: saving ? 0.7 : 1 }}>
              {saving ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Check size={15} />}
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
        {/* Avatar + info */}
        <div style={{ background: 'var(--surface)', paddingBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative', marginTop: '1.25rem' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: user?.avatar_url ? 'transparent' : 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.5rem', overflow: 'hidden', boxShadow: '0 4px 16px rgba(132,36,123,0.2)' }}>
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : avatarLetters
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatar} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={avatarUploading}
              style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--primary)' }}
            >
              {avatarUploading ? <span className="spinner-primary" style={{ width: 12, height: 12 }} /> : <Camera size={13} />}
            </button>
          </div>

          {editing ? (
            <div style={{ width: '100%', padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input
                className="input-field"
                placeholder={t.displayName}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={{ paddingLeft: '1rem', textAlign: 'center', fontSize: '1rem', fontWeight: 700 }}
              />
              <input
                className="input-field"
                placeholder={`@${t.username}`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: '1rem', textAlign: 'center', fontSize: '0.9rem' }}
              />
              <textarea
                placeholder={t.bioPlaceholder}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={{ background: 'var(--input-bg)', borderRadius: 'var(--radius-sm)', border: 'none', padding: '0.75rem 1rem', width: '100%', outline: 'none', fontFamily: "'Baloo Da 2', sans-serif", fontSize: '0.875rem', color: 'var(--text)', resize: 'none', minHeight: 64, textAlign: 'center' }}
              />
            </div>
          ) : (
            <>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)' }}>{user?.display_name ?? '…'}</div>
              {user?.username && <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>@{user.username}</div>}
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{user?.email ?? ''}</div>
              {user?.bio && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '0 1.5rem', lineHeight: 1.5 }}>{user.bio}</div>}
            </>
          )}
        </div>

        {/* Stats */}
        <div style={{ margin: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', boxShadow: 'var(--shadow-card)' }}>
          {([
            [stats.messages_count.toLocaleString(), t.statsMessages],
            [stats.groups_count.toString(), t.statsGroups],
            [stats.channels_count.toString(), t.statsChannels],
          ] as [string, string][]).map(([val, lbl], i) => (
            <div key={lbl} style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>{val}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Settings */}
        <div style={{ margin: '0 1rem 1rem' }}>
          <div className="section-label">{t.settingsSection}</div>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
            {SETTINGS_ITEMS.map((s, i) => (
              <button
                key={s.label}
                onClick={() => setPage(s.page)}
                style={{ width: '100%', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.875rem', border: 'none', background: 'var(--surface)', cursor: 'pointer', borderBottom: i < SETTINGS_ITEMS.length - 1 ? '1px solid var(--border)' : 'none', fontFamily: "'Baloo Da 2', sans-serif", transition: 'background var(--duration) var(--ease)' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{s.label}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.desc}</div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </button>
            ))}
          </div>
        </div>

        {/* Logout */}
        <div style={{ margin: '0 1rem 2rem' }}>
          <button onClick={handleLogout} style={{ width: '100%', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.875rem', border: 'none', background: 'var(--surface)', cursor: 'pointer', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', color: 'var(--danger)', fontWeight: 700, fontFamily: "'Baloo Da 2', sans-serif", fontSize: '0.9rem', transition: 'background var(--duration) var(--ease)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LogOut size={16} color="var(--danger)" /></div>
            {t.logout}
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}
