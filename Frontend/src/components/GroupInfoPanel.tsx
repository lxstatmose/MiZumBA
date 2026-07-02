import { useState, useEffect, useCallback } from 'react'
import { X, Shield, User, Trash2, UserPlus, LogOut, Edit2, Check } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { getChatDetail, updateGroupChat, deleteGroupChat, leaveGroupChat, addChatMember, removeChatMember, updateMemberRole } from '../api/chats'
import { searchUsers } from '../api/users'
import type { ChatDetail, ChatMemberPublic } from '../types/api'
import type { SearchItem } from '../api/users'

interface Props {
  chatId: string
  onClose: () => void
  onDeleted: () => void
}

function RoleBadge({ role }: { role: string }) {
  const { t } = useSettingsStore()
  if (role === 'owner') return <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', borderRadius: 4, padding: '1px 5px' }}>{t.ownerBadge}</span>
  if (role === 'admin') return <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--primary)', background: 'rgba(132,36,123,0.1)', borderRadius: 4, padding: '1px 5px' }}>{t.adminBadge}</span>
  return null
}

export default function GroupInfoPanel({ chatId, onClose, onDeleted }: Props) {
  const { user: me } = useAppStore()
  const { t } = useSettingsStore()
  const [chat, setChat] = useState<ChatDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingTitle, setEditingTitle] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [addSearch, setAddSearch] = useState('')
  const [addResults, setAddResults] = useState<SearchItem[]>([])
  const [busyMember, setBusyMember] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)

  const myMember = chat?.members.find((m) => m.user.id === me?.id)
  const isOwner = myMember?.role === 'owner'
  const isAdmin = myMember?.role === 'admin' || isOwner

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getChatDetail(chatId)
      setChat(data as ChatDetail)
      setNewTitle(data.title ?? '')
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [chatId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload()
  }, [reload])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (addSearch.length < 2) { setAddResults([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await searchUsers(addSearch)
        setAddResults(res.users)
      } catch { /* ignore */ }
    }, 350)
    return () => clearTimeout(timer)
  }, [addSearch])

  const saveTitle = async () => {
    if (!newTitle.trim() || newTitle === chat?.title) { setEditingTitle(false); return }
    try {
      await updateGroupChat(chatId, newTitle.trim())
      await reload()
      setEditingTitle(false)
    } catch { /* ignore */ }
  }

  const handleRemove = async (member: ChatMemberPublic) => {
    setBusyMember(member.user.id)
    try {
      await removeChatMember(chatId, member.user.id)
      await reload()
    } catch { /* ignore */ }
    finally { setBusyMember(null) }
  }

  const handleRole = async (member: ChatMemberPublic, role: 'admin' | 'member') => {
    setBusyMember(member.user.id)
    try {
      await updateMemberRole(chatId, member.user.id, role)
      await reload()
    } catch { /* ignore */ }
    finally { setBusyMember(null) }
  }

  const handleAdd = async (item: SearchItem) => {
    setAddSearch('')
    setAddResults([])
    setBusyMember(item.id)
    try {
      await addChatMember(chatId, item.id)
      await reload()
    } catch { /* ignore */ }
    finally { setBusyMember(null) }
  }

  const handleLeave = async () => {
    if (!window.confirm(t.leaveGroup + '?')) return
    setActionBusy(true)
    try {
      await leaveGroupChat(chatId)
      onDeleted()
    } catch { /* ignore */ }
    finally { setActionBusy(false) }
  }

  const handleDelete = async () => {
    if (!window.confirm(t.confirmDelete)) return
    setActionBusy(true)
    try {
      await deleteGroupChat(chatId)
      onDeleted()
    } catch { /* ignore */ }
    finally { setActionBusy(false) }
  }

  const sortedMembers = chat?.members.slice().sort((a, b) => {
    const order = { owner: 0, admin: 1, member: 2 }
    return order[a.role] - order[b.role]
  }) ?? []

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 380, height: '100%',
          background: 'var(--bg)', borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '1rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={20} />
          </button>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>{t.groupInfo}</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>{t.loading}</div>
          ) : (
            <>
              {/* Chat name */}
              <div style={{ padding: '1.25rem 1rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.2rem', flexShrink: 0 }}>
                    {(chat?.title ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editingTitle && isAdmin ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          className="input-field"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                          style={{ flex: 1 }}
                          autoFocus
                        />
                        <button onClick={saveTitle} style={{ border: 'none', background: 'var(--gradient)', color: 'white', borderRadius: 'var(--radius-sm)', padding: '0.5rem', cursor: 'pointer', display: 'flex' }}>
                          <Check size={16} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }} className="truncate">{chat?.title}</span>
                        {isAdmin && (
                          <button onClick={() => setEditingTitle(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '0.2rem' }}>
                            <Edit2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {chat?.members.length} {t.members}
                    </div>
                  </div>
                </div>
              </div>

              {/* Members */}
              <div style={{ padding: '0.75rem 1rem 0.25rem' }}>
                <div className="section-label">{t.members}</div>
              </div>

              {sortedMembers.map((member) => {
                const isSelf = member.user.id === me?.id
                const canManage = isOwner && !isSelf && member.role !== 'owner'
                return (
                  <div key={member.user.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1rem', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0, overflow: 'hidden' }}>
                      {member.user.avatar_url
                        ? <img src={member.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : member.user.display_name.charAt(0).toUpperCase()
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }} className="truncate">{member.user.display_name}</span>
                        <RoleBadge role={member.role} />
                      </div>
                      {member.user.username && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{member.user.username}</div>}
                    </div>
                    {busyMember === member.user.id ? (
                      <span className="spinner-primary" style={{ width: 16, height: 16 }} />
                    ) : canManage && (
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          onClick={() => handleRole(member, member.role === 'admin' ? 'member' : 'admin')}
                          title={member.role === 'admin' ? t.demoteMember : t.promoteMember}
                          style={{ border: '1px solid var(--border)', background: 'none', borderRadius: 'var(--radius-xs)', padding: '0.3rem', cursor: 'pointer', color: member.role === 'admin' ? 'var(--primary)' : 'var(--text-muted)', display: 'flex' }}
                        >
                          {member.role === 'admin' ? <User size={13} /> : <Shield size={13} />}
                        </button>
                        <button
                          onClick={() => handleRemove(member)}
                          title={t.removeMember}
                          style={{ border: '1px solid var(--border)', background: 'none', borderRadius: 'var(--radius-xs)', padding: '0.3rem', cursor: 'pointer', color: '#ef4444', display: 'flex' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Add member (admin) */}
              {isAdmin && (
                <div style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <UserPlus size={14} color="var(--primary)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>{t.addMember}</span>
                  </div>
                  <input
                    className="input-field"
                    placeholder={t.searchMembers}
                    value={addSearch}
                    onChange={(e) => setAddSearch(e.target.value)}
                  />
                  {addResults.length > 0 && (
                    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginTop: '0.25rem', overflow: 'hidden' }}>
                      {addResults.slice(0, 5).map((r) => (
                        <button
                          key={r.id}
                          onClick={() => handleAdd(r)}
                          disabled={busyMember === r.id}
                          style={{ width: '100%', padding: '0.6rem 0.875rem', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem', color: 'var(--text)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                          <span style={{ fontWeight: 600 }}>{r.title}</span>
                          {r.subtitle && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{r.subtitle}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Leave / Delete */}
              <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                {!isOwner && (
                  <button
                    onClick={handleLeave}
                    disabled={actionBusy}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.75rem 1rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', fontFamily: "'Baloo Da 2', sans-serif" }}
                  >
                    <LogOut size={16} /> {t.leaveGroup}
                  </button>
                )}
                {isOwner && (
                  <button
                    onClick={handleDelete}
                    disabled={actionBusy}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.75rem 1rem', border: '1.5px solid rgba(239,68,68,0.35)', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.05)', cursor: 'pointer', color: '#ef4444', fontWeight: 600, fontSize: '0.875rem', fontFamily: "'Baloo Da 2', sans-serif" }}
                  >
                    <Trash2 size={16} /> {t.deleteGroup}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
