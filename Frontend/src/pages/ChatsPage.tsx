import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Search, Plus, Mic, Send, Paperclip,
  ChevronLeft, MoreVertical, Edit2, Trash2, Reply,
  Smile, X, Check, CheckCheck, Copy, Forward,
  ChevronDown, Type,
} from 'lucide-react'
import type { Translations } from '../i18n/en'
import CreateChatModal from '../components/CreateChatModal'
import GroupInfoPanel from '../components/GroupInfoPanel'
import UserProfileCard from '../components/UserProfileCard'
import EmojiPicker from '../components/EmojiPicker'
import { listChats, getMessages, sendMessageRest, markRead, getChatDetail } from '../api/chats'
import { editMessage, deleteMessage, addReaction, transcribeMessage } from '../api/messages'
import { uploadFile, uploadVoice } from '../api/files'
import { socket } from '../ws/socket'
import type { ChatSummary, MessagePublic } from '../types/api'
import { useAppStore } from '../store/useAppStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useIsDesktop } from '../hooks/useIsDesktop'

/* ── Helpers ─────────────────────────────────────────────────── */
function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

const COLORS = ['#4fc3f7', '#84247B', '#e91e63', '#ff9800', '#4caf50', '#9c27b0']
function avatarColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return COLORS[h % COLORS.length]
}

function formatTime(iso: string, t: Translations) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return t.now
  if (diff < 3_600_000) return t.minAgo(Math.floor(diff / 60_000))
  if (diff < 86_400_000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diff < 172_800_000) return t.yesterday
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

function formatDate(iso: string, t: Translations) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86_400_000 && d.getDate() === now.getDate()) return t.today
  if (diff < 172_800_000) return t.yesterday
  return d.toLocaleDateString([], { day: 'numeric', month: 'long', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

function isSameDay(a: string, b: string) {
  const da = new Date(a), db = new Date(b)
  return da.getDate() === db.getDate() && da.getMonth() === db.getMonth() && da.getFullYear() === db.getFullYear()
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉']

/* ── Draft message store ─────────────────────────────────────── */
const drafts = new Map<string, string>()

/* ── Typing store (module-level) ─────────────────────────────── */
const typingUsers = new Map<string, Set<string>>()
const typingListeners = new Set<() => void>()
function notifyTyping() { typingListeners.forEach((fn) => fn()) }
function setTyping(chatId: string, userId: string, active: boolean) {
  let set = typingUsers.get(chatId)
  if (!set) { set = new Set(); typingUsers.set(chatId, set) }
  if (active) set.add(userId)
  else set.delete(userId)
  notifyTyping()
}
function useTypingUsers(chatId: string | null) {
  const [, tick] = useState(0)
  useEffect(() => {
    const fn = () => tick((n) => n + 1)
    typingListeners.add(fn)
    return () => { typingListeners.delete(fn) }
  }, [])
  if (!chatId) return []
  return Array.from(typingUsers.get(chatId) ?? [])
}

/* ── Reaction bar ────────────────────────────────────────────── */
function ReactionBar({ messageId, onClose }: { messageId: string; onClose: () => void }) {
  return (
    <div className="emoji-picker" style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 4, zIndex: 20 }}>
      {EMOJIS.map((e) => (
        <button key={e} className="emoji-btn" onClick={() => { addReaction(messageId, e).catch(() => {}); onClose() }}>{e}</button>
      ))}
    </div>
  )
}

/* ── Image lightbox ──────────────────────────────────────────── */
function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
    >
      <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', border: 'none', background: 'rgba(255,255,255,0.15)', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <X size={20} />
      </button>
      <img
        src={src}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 'var(--radius-sm)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', cursor: 'default' }}
      />
    </div>
  )
}

/* ── Message bubble ──────────────────────────────────────────── */
function MessageBubble({
  msg, mine, isGroup, replyMsg, onReply, onEdit, onDelete, onCopy, onForward, onAvatarClick, onTranscribe, t, isDesktop,
}: {
  msg: MessagePublic; mine: boolean; isGroup: boolean;
  replyMsg?: MessagePublic | null; onReply: () => void; onEdit: () => void;
  onDelete: () => void; onCopy: () => void; onForward: () => void;
  onAvatarClick?: (userId: string) => void;
  onTranscribe?: (msg: MessagePublic) => Promise<void>;
  t: Translations
  isDesktop: boolean
}) {
  const [showCtx, setShowCtx] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [ctxPos, setCtxPos] = useState<{ x: number; y: number } | null>(null)
  const [transcribing, setTranscribing] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const ctxRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!showCtx && !showEmoji) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowCtx(false); setShowEmoji(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [showCtx, showEmoji])

  // Smart context menu position
  useEffect(() => {
    if (!showCtx || !ctxRef.current || !ctxPos) return
    const el = ctxRef.current
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth; const vh = window.innerHeight
    let x = ctxPos.x; let y = ctxPos.y
    if (x + rect.width > vw - 8) x = vw - rect.width - 8
    if (y + rect.height > vh - 8) y = y - rect.height
    if (x < 8) x = 8
    el.style.left = x + 'px'
    el.style.top = y + 'px'
  }, [showCtx, ctxPos])

  const openCtx = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const x = 'clientX' in e ? e.clientX : (e as React.TouchEvent).touches[0]?.clientX ?? 0
    const y = 'clientY' in e ? e.clientY : (e as React.TouchEvent).touches[0]?.clientY ?? 0
    setCtxPos({ x, y })
    setShowCtx(true)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDesktop) return
    longPressTimer.current = setTimeout(() => openCtx(e), 500)
  }
  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  if (msg.type === 'system') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '0.35rem 0' }}>
        <div style={{ background: 'rgba(132,36,123,0.08)', borderRadius: 'var(--radius-full)', padding: '0.2rem 0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {msg.text}
        </div>
      </div>
    )
  }

  if (msg.deleted_at) {
    return (
      <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', padding: '0.1rem 0' }}>
        <div style={{ padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--input-bg)', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
          🗑 {t.deletedMessage}
        </div>
      </div>
    )
  }

  return (
    <>
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      <div ref={ref} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', padding: '0.1rem 0', position: 'relative' }}>
        {!mine && isGroup && (
          <button
            onClick={() => onAvatarClick?.(msg.sender_id)}
            style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor(msg.sender_id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0, marginRight: '0.4rem', alignSelf: 'flex-end', border: 'none', cursor: 'pointer', padding: 0, overflow: 'hidden' }}>
            {msg.sender?.avatar_url
              ? <img src={msg.sender.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials(msg.sender?.display_name ?? null)
            }
          </button>
        )}

        <div style={{ maxWidth: '72%', position: 'relative' }}>
          {replyMsg && (
            <div style={{ fontSize: '0.75rem', color: mine ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)', borderLeft: '2.5px solid', borderColor: mine ? 'rgba(255,255,255,0.5)' : 'var(--primary)', paddingLeft: '0.5rem', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              {replyMsg.text}
            </div>
          )}

          <div
            onClick={isDesktop ? undefined : openCtx}
            onContextMenu={isDesktop ? openCtx : undefined}
            onTouchStart={!isDesktop ? handleTouchStart : undefined}
            onTouchEnd={cancelLongPress}
            onTouchMove={cancelLongPress}
            style={{
              padding: '0.55rem 0.875rem',
              borderRadius: mine ? '1rem 1rem 0.2rem 1rem' : '1rem 1rem 1rem 0.2rem',
              background: mine ? 'linear-gradient(135deg, #8EEBF2 0%, #84247B 100%)' : 'var(--bubble-other)',
              color: mine ? 'white' : 'var(--bubble-other-text)',
              fontSize: '0.9rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              cursor: 'pointer',
              wordBreak: 'break-word',
            }}
          >
            {!mine && isGroup && (
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: mine ? 'rgba(255,255,255,0.85)' : 'var(--primary)', marginBottom: '0.15rem' }}>
                {msg.sender?.display_name ?? 'User'}
              </div>
            )}
            {msg.attachment_url && (
              <div style={{ marginBottom: '0.3rem' }}>
                {msg.attachment_mime_type?.startsWith('image/') ? (
                  <img
                    src={msg.attachment_url}
                    alt={msg.attachment_name ?? ''}
                    onClick={(e) => { e.stopPropagation(); setLightboxSrc(msg.attachment_url!) }}
                    style={{ maxWidth: 200, maxHeight: 200, borderRadius: 'var(--radius-xs)', display: 'block', cursor: 'zoom-in' }}
                  />
                ) : (msg.attachment_mime_type?.startsWith('audio/') || msg.type === 'audio') ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <audio
                      controls
                      src={msg.attachment_url}
                      style={{ maxWidth: 220, display: 'block', borderRadius: 4, height: 36 }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {!msg.text && onTranscribe && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setTranscribing(true); onTranscribe(msg).finally(() => setTranscribing(false)); }}
                        disabled={transcribing}
                        title={t.transcribeAudio}
                        style={{ border: 'none', background: mine ? 'rgba(255,255,255,0.2)' : 'rgba(132,36,123,0.1)', color: mine ? 'white' : 'var(--primary)', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        {transcribing ? <span className="spinner-primary" style={{ width: 14, height: 14, borderColor: mine ? 'white' : 'var(--primary)', borderRightColor: 'transparent' }} /> : <Type size={14} />}
                      </button>
                    )}
                  </div>
                ) : (
                  <a href={msg.attachment_url} target="_blank" rel="noreferrer" style={{ color: 'inherit', opacity: 0.85, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Paperclip size={12} /> {msg.attachment_name ?? 'File'}
                  </a>
                )}
              </div>
            )}
            {msg.text && <div>{msg.text}</div>}
            <div style={{ fontSize: '0.6rem', textAlign: 'right', marginTop: '0.2rem', opacity: 0.65, display: 'flex', gap: '0.3rem', alignItems: 'center', justifyContent: 'flex-end' }}>
              {msg.edited_at && <span style={{ fontStyle: 'italic' }}>{t.edited}</span>}
              <span>{formatTime(msg.created_at, t)}</span>
              {mine && <CheckCheck size={10} />}
            </div>
          </div>

          {/* Context menu (fixed position) */}
          {showCtx && ctxPos && (
            <div
              ref={ctxRef}
              className="ctx-menu"
              style={{ position: 'fixed', left: ctxPos.x, top: ctxPos.y, zIndex: 500 }}
            >
              <button className="ctx-item" onClick={() => { onReply(); setShowCtx(false) }}><Reply size={14} /> {t.reply}</button>
              <button className="ctx-item" onClick={() => { onCopy(); setShowCtx(false) }}><Copy size={14} /> {t.copyText}</button>
              <button className="ctx-item" onClick={() => { setShowEmoji(true); setShowCtx(false) }}><Smile size={14} /> {t.addReaction}</button>
              <button className="ctx-item" onClick={() => { onForward(); setShowCtx(false) }}><Forward size={14} /> {t.forward}</button>
              {mine && <button className="ctx-item" onClick={() => { onEdit(); setShowCtx(false) }}><Edit2 size={14} /> {t.editMessage}</button>}
              {mine && <button className="ctx-item danger" onClick={() => { onDelete(); setShowCtx(false) }}><Trash2 size={14} /> {t.deleteMessage}</button>}
            </div>
          )}

          {/* Emoji reaction picker */}
          {showEmoji && (
            <div style={{ position: 'absolute', bottom: '100%', [mine ? 'right' : 'left']: 0, marginBottom: 4, zIndex: 20 }}>
              <ReactionBar messageId={msg.id} onClose={() => setShowEmoji(false)} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* ── Date separator ──────────────────────────────────────────── */
function DateSeparator({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', userSelect: 'none' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

/* ── Forward modal ───────────────────────────────────────────── */
function ForwardModal({ chats, onForward, onClose }: { chats: ChatSummary[]; onForward: (chatId: string) => void; onClose: () => void }) {
  const { t } = useSettingsStore()
  const [search, setSearch] = useState('')
  const filtered = chats.filter((c) => (c.title ?? '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: 'var(--surface)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', maxHeight: '60vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 700, flex: 1, color: 'var(--text)' }}>{t.forwardTo}</span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '0.5rem 1rem' }}>
          <input className="input-field" placeholder={t.searchChats} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map((c) => (
            <button key={c.id} onClick={() => onForward(c.id)} style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor(c.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                {initials(c.title)}
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }} className="truncate">{c.title ?? 'Chat'}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Chat view (messages + input) ────────────────────────────── */
function ChatView({ chat, allChats, onBack, isDesktop, onChatDeleted }: {
  chat: ChatSummary; allChats: ChatSummary[]; onBack: () => void; isDesktop: boolean; onChatDeleted: () => void
}) {
  const { user } = useAppStore()
  const { t } = useSettingsStore()
  const [messages, setMessages] = useState<MessagePublic[]>([])
  const [messagesMap, setMessagesMap] = useState<Map<string, MessagePublic>>(new Map())
  const [message, setMessage] = useState(drafts.get(chat.id) ?? '')
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [replyTo, setReplyTo] = useState<MessagePublic | null>(null)
  const [editingMsg, setEditingMsg] = useState<MessagePublic | null>(null)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [forwardMsg, setForwardMsg] = useState<MessagePublic | null>(null)
  const [atBottom, setAtBottom] = useState(true)
  const [newMsgCount, setNewMsgCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const typingUserIds = useTypingUsers(chat.id)
  const prevChatId = useRef<string | null>(null)

  // Save draft when leaving chat
  useEffect(() => {
    return () => {
      if (prevChatId.current && message) drafts.set(prevChatId.current, message)
      else if (prevChatId.current) drafts.delete(prevChatId.current)
    }
  })
  useEffect(() => {
    prevChatId.current = chat.id
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessage(drafts.get(chat.id) ?? '')
  }, [chat.id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
     
    setMessages([])
     
    setMessagesMap(new Map())
    setReplyTo(null)
    setEditingMsg(null)
    setHasMore(true)
    setNewMsgCount(0)
    setAtBottom(true)
    getMessages(chat.id).then((data) => {
      setMessages(data)
      const m = new Map<string, MessagePublic>()
      data.forEach((msg) => m.set(msg.id, msg))
      setMessagesMap(m)
      setHasMore(data.length >= 50)
      if (data.length > 0) markRead(chat.id, data[data.length - 1].id).catch(() => {})
    }).catch(() => {}).finally(() => setLoading(false))
  }, [chat.id])

  useEffect(() => {
    const off = socket.on((ev) => {
      if (ev.type === 'message.created') {
        const msg = ev.payload.message as MessagePublic
        if (msg.chat_id !== chat.id) return
        setMessages((prev) => [...prev, msg])
        setMessagesMap((prev) => new Map(prev).set(msg.id, msg))
        if (atBottom) {
          markRead(chat.id, msg.id).catch(() => {})
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        } else {
          setNewMsgCount((n) => n + 1)
        }
      }
      if (ev.type === 'message.updated') {
        const updatedMsg = ev.payload.message as MessagePublic
        if (updatedMsg.chat_id === chat.id) {
          setMessages((prev) => prev.map((m) => m.id === updatedMsg.id ? updatedMsg : m))
          setMessagesMap((prev) => new Map(prev).set(updatedMsg.id, updatedMsg))
        }
      }
      if (ev.type === 'typing.start') {
        const { chat_id, user_id } = ev.payload as { chat_id: string; user_id: string }
        if (chat_id === chat.id && user_id !== user?.id) setTyping(chat.id, user_id, true)
      }
      if (ev.type === 'typing.stop') {
        const { chat_id, user_id } = ev.payload as { chat_id: string; user_id: string }
        if (chat_id === chat.id) setTyping(chat.id, user_id, false)
      }
    })
    return () => { off(); typingUsers.delete(chat.id); notifyTyping() }
  }, [chat.id, user?.id, atBottom])

  // Auto-scroll on load
  useEffect(() => {
    if (!loading) {
      messagesEndRef.current?.scrollIntoView()
    }
  }, [loading])

  // Auto-scroll on typing indicators
  useEffect(() => {
    if (atBottom) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [typingUserIds.length, atBottom])

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.ondataavailable = null
        mediaRecorderRef.current.onstop = null
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    setAtBottom(isNearBottom)
    if (isNearBottom && newMsgCount > 0) {
      setNewMsgCount(0)
      const msgs = messages
      if (msgs.length > 0) markRead(chat.id, msgs[msgs.length - 1].id).catch(() => {})
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setNewMsgCount(0)
    setAtBottom(true)
    const msgs = messages
    if (msgs.length > 0) markRead(chat.id, msgs[msgs.length - 1].id).catch(() => {})
  }

  const loadEarlier = async () => {
    if (loadingEarlier || !hasMore || messages.length === 0) return
    setLoadingEarlier(true)
    const firstId = messages[0].id
    const scrollEl = scrollRef.current
    const prevScrollHeight = scrollEl?.scrollHeight ?? 0
    try {
      const older = await getMessages(chat.id, 50, firstId)
      if (older.length < 50) setHasMore(false)
      setMessages((prev) => [...older, ...prev])
      older.forEach((m) => setMessagesMap((prev) => new Map(prev).set(m.id, m)))
      // Restore scroll position
      requestAnimationFrame(() => {
        if (scrollEl) {
          scrollEl.scrollTop = scrollEl.scrollHeight - prevScrollHeight
        }
      })
    } catch { /* ignore */ }
    finally { setLoadingEarlier(false) }
  }

  const handleTyping = () => {
    socket.send('typing.start', { chat_id: chat.id })
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      socket.send('typing.stop', { chat_id: chat.id })
    }, 3000)
  }

  const handleSend = async () => {
    const text = message.trim()
    if (!text && !editingMsg) return
    if (sending) return

    if (editingMsg) {
      setEditingMsg(null)
      setMessage('')
      drafts.delete(chat.id)
      editMessage(editingMsg.id, text).then((updated) => {
        setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m))
        setMessagesMap((prev) => new Map(prev).set(updated.id, updated))
      }).catch(() => {})
      return
    }

    setMessage('')
    drafts.delete(chat.id)
    setSending(true)
    const sent = socket.send('message.send', { chat_id: chat.id, text, type: 'text', reply_to_id: replyTo?.id ?? null })
    setReplyTo(null)
    if (!sent) {
      try {
        const msg = await sendMessageRest(chat.id, text, replyTo?.id)
        setMessages((prev) => [...prev, msg])
        setMessagesMap((prev) => new Map(prev).set(msg.id, msg))
      } catch { setMessage(text) }
    }
    setSending(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    try {
      const uploaded = await uploadFile(file)
      const msgType = file.type.startsWith('image/') ? 'image' : 'file'
      const sent = socket.send('message.send', {
        chat_id: chat.id, text: '', type: msgType,
        attachment_url: uploaded.url, attachment_mime_type: uploaded.mime_type,
        attachment_name: uploaded.original_filename, attachment_size: uploaded.size_bytes,
        reply_to_id: null,
      })
      if (!sent) {
        const msg = await sendMessageRest(chat.id, '', undefined, {
          url: uploaded.url, mime_type: uploaded.mime_type,
          name: uploaded.original_filename, size: uploaded.size_bytes, type: msgType,
        })
        setMessages((prev) => [...prev, msg])
      }
    } catch { /* silently fail */ }
    finally { setUploading(false) }
  }

  const handleDelete = (msg: MessagePublic) => {
    deleteMessage(msg.id).then(() => {
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, deleted_at: new Date().toISOString() } : m))
    }).catch(() => {})
  }

  const handleForwardSend = async (targetChatId: string, text: string) => {
    setForwardMsg(null)
    socket.send('message.send', { chat_id: targetChatId, text, type: 'text', reply_to_id: null })
  }

  const startEdit = (msg: MessagePublic) => {
    setEditingMsg(msg)
    setReplyTo(null)
    setMessage(msg.text)
    inputRef.current?.focus()
  }

  const cancelEdit = () => { setEditingMsg(null); setMessage('') }
  const cancelReply = () => setReplyTo(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        if (audioChunksRef.current.length === 0) return
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        const ext = mimeType.includes('ogg') ? 'ogg' : 'webm'
        const baseMime = mimeType.split(';')[0]
        const file = new File([blob], `voice.${ext}`, { type: baseMime })
        setUploading(true)
        try {
          const uploaded = await uploadVoice(file)
          const payload = {
            chat_id: chat.id, text: '', type: 'audio' as const,
            attachment_url: uploaded.url, attachment_mime_type: uploaded.mime_type,
            attachment_name: uploaded.original_filename, attachment_size: uploaded.size_bytes,
            reply_to_id: replyTo?.id ?? null,
          }
          const sent = socket.send('message.send', payload)
          if (!sent) {
            const msg = await sendMessageRest(chat.id, '', replyTo?.id, {
              url: uploaded.url, mime_type: uploaded.mime_type,
              name: uploaded.original_filename, size: uploaded.size_bytes, type: 'audio',
            })
            setMessages((prev) => [...prev, msg])
            setMessagesMap((prev) => new Map(prev).set(msg.id, msg))
          }
          setReplyTo(null)
        } catch { /* ignore */ }
        finally { setUploading(false) }
      }
      recorder.start(100)
      setRecording(true)
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => setRecordingTime((n) => n + 1), 1000)
    } catch { /* user denied permission */ }
  }

  const stopRecording = () => {
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.requestData()
      }
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null
    setRecording(false)
    setRecordingTime(0)
  }

  const cancelRecording = () => {
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null
      mediaRecorderRef.current.onstop = null
      if (mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    audioChunksRef.current = []
    setRecording(false)
    setRecordingTime(0)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: '0.75rem 1rem', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {!isDesktop && (
          <button onClick={onBack} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex' }}>
            <ChevronLeft size={24} />
          </button>
        )}
        <div
          onClick={() => chat.type === 'group' && setShowGroupInfo(true)}
          style={{ width: 38, height: 38, borderRadius: '50%', background: avatarColor(chat.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0, overflow: 'hidden', cursor: chat.type === 'group' ? 'pointer' : 'default' }}>
          {chat.avatar_url ? <img src={chat.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(chat.title)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            onClick={() => chat.type === 'group' && setShowGroupInfo(true)}
            style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', cursor: chat.type === 'group' ? 'pointer' : 'default' }}
            className="truncate"
          >{chat.title ?? 'Chat'}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>
            {typingUserIds.length > 0
              ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>{t.typing} <span className="typing-dots" style={{ display: 'inline-flex' }}>{[0,1,2].map((i) => <span key={i} className="typing-dot" style={{ display: 'inline-block' }} />)}</span></span>
              : chat.type === 'group' ? `${chat.members_count} ${t.members}` : t.online
            }
          </div>
        </div>
        {chat.type === 'group' && (
          <button onClick={() => setShowGroupInfo(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <MoreVertical size={20} />
          </button>
        )}
      </div>

      {/* Messages container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', position: 'relative' }}
      >
        {/* Load earlier button */}
        {!loading && hasMore && (
          <div style={{ textAlign: 'center', paddingBottom: '0.5rem' }}>
            <button
              onClick={loadEarlier}
              disabled={loadingEarlier}
              style={{ border: '1.5px solid var(--border)', background: 'var(--surface)', borderRadius: 'var(--radius-full)', padding: '0.35rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', fontFamily: "'Baloo Da 2', sans-serif" }}
            >
              {loadingEarlier ? t.loading : t.loadEarlier}
            </button>
          </div>
        )}
        {!loading && !hasMore && messages.length > 0 && (
          <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>{t.noMoreMessages}</div>
        )}

        {loading && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.85rem' }}>{t.loadingMessages}</div>}
        {!loading && messages.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.85rem' }}>{t.noMessages}</div>}

        {messages.map((m, idx) => {
          const prevMsg = messages[idx - 1]
          const showDate = !prevMsg || !isSameDay(prevMsg.created_at, m.created_at)
          return (
            <div key={m.id}>
              {showDate && <DateSeparator label={formatDate(m.created_at, t)} />}
              <MessageBubble
                msg={m}
                mine={m.sender_id === user?.id}
                isGroup={chat.type === 'group'}
                replyMsg={m.reply_to_id ? messagesMap.get(m.reply_to_id) : null}
                onReply={() => { setReplyTo(m); setEditingMsg(null); inputRef.current?.focus() }}
                onEdit={() => startEdit(m)}
                onDelete={() => handleDelete(m)}
                onCopy={() => navigator.clipboard.writeText(m.text).catch(() => {})}
                onForward={() => setForwardMsg(m)}
                onAvatarClick={(uid) => setProfileUserId(uid)}
                onTranscribe={async (msg) => {
                  try {
                    const updated = await transcribeMessage(msg.id);
                    setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m));
                    setMessagesMap((prev) => new Map(prev).set(updated.id, updated));
                  } catch (e) {
                    console.error(e)
                  }
                }}
                t={t}
                isDesktop={isDesktop}
              />
            </div>
          )
        })}

        {/* Typing indicator */}
        {typingUserIds.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '0.1rem 0' }}>
            <div style={{ padding: '0.5rem 0.875rem', borderRadius: '1rem 1rem 1rem 0.2rem', background: 'var(--bubble-other)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div className="typing-dots">
                {[0,1,2].map((i) => <span key={i} className="typing-dot" />)}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />

        {/* Scroll to bottom button */}
        {!atBottom && (
          <button
            onClick={scrollToBottom}
            style={{
              position: 'sticky', bottom: '0.75rem', alignSelf: 'flex-end',
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--surface)', border: '1.5px solid var(--border)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10,
            }}
          >
            {newMsgCount > 0 && (
              <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, background: 'var(--gradient)', color: 'white', fontSize: '0.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                {newMsgCount}
              </span>
            )}
            <ChevronDown size={18} />
          </button>
        )}
      </div>

      {/* Input area */}
      <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', flexShrink: 0, paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}>
        {(replyTo || editingMsg) && (
          <div className="reply-bar">
            {replyTo && <><Reply size={14} color="var(--primary)" /><span style={{ flex: 1 }}><strong>{t.replyingTo}:</strong> {replyTo.text}</span></>}
            {editingMsg && <><Edit2 size={14} color="var(--primary)" /><span style={{ flex: 1 }}><strong>{t.editingMessage}</strong></span></>}
            <button onClick={replyTo ? cancelReply : cancelEdit} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
              <X size={14} />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.875rem', position: 'relative' }}>
          <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
          <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '0.25rem' }}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <span className="spinner-primary" style={{ width: 18, height: 18 }} /> : <Paperclip size={20} />}
          </button>

          <div style={{ flex: 1, background: 'var(--input-bg)', borderRadius: 'var(--radius-full)', padding: '0.45rem 0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
            <input
              ref={inputRef}
              className="input-bare"
              placeholder={t.messagePlaceholder}
              value={message}
              onChange={(e) => { setMessage(e.target.value); handleTyping() }}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            />
            <button
              onClick={() => setShowEmojiPicker((s) => !s)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '0.1rem', flexShrink: 0 }}
            >
              <Smile size={18} />
            </button>
            {showEmojiPicker && (
              <div style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: 4 }}>
                <EmojiPicker onSelect={(e) => setMessage((m) => m + e)} onClose={() => setShowEmojiPicker(false)} />
              </div>
            )}
          </div>

          {message.trim() || editingMsg ? (
            <button className="voice-btn" onClick={handleSend} disabled={sending}>
              {editingMsg ? <Check size={18} /> : <Send size={18} />}
            </button>
          ) : recording ? (
            <>
              <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 700, minWidth: 36, textAlign: 'center' }}>{formatDuration(recordingTime)}</span>
              <button
                className="voice-btn"
                onClick={cancelRecording}
                style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1.5px solid rgba(239,68,68,0.3)' }}
              >
                <X size={16} />
              </button>
              <button className="voice-btn recording" onClick={stopRecording}>
                <Check size={16} />
              </button>
            </>
          ) : (
            <button className="voice-btn" onClick={startRecording}>
              <Mic size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Overlays */}
      {showGroupInfo && (
        <GroupInfoPanel
          chatId={chat.id}
          onClose={() => setShowGroupInfo(false)}
          onDeleted={() => { setShowGroupInfo(false); onChatDeleted() }}
        />
      )}
      {profileUserId && (
        <UserProfileCard userId={profileUserId} onClose={() => setProfileUserId(null)} />
      )}
      {forwardMsg && (
        <ForwardModal
          chats={allChats.filter((c) => c.id !== chat.id)}
          onForward={(chatId) => handleForwardSend(chatId, forwardMsg.text)}
          onClose={() => setForwardMsg(null)}
        />
      )}
    </div>
  )
}

/* ── Chat list panel ─────────────────────────────────────────── */
function ChatListPanel({ onOpen, openChatId, onChatsLoaded, onOpenChat }: {
  onOpen: (chat: ChatSummary) => void; openChatId: string | null; onChatsLoaded?: (chats: ChatSummary[]) => void; onOpenChat?: (chatId: string) => void
}) {
  const { t } = useSettingsStore()
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await listChats()
      const sorted = data.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      setChats(sorted)
      onChatsLoaded?.(sorted)
    } catch { /* silently fail */ }
    finally { setLoading(false) }
  }, [onChatsLoaded])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  useEffect(() => {
    const off = socket.on((ev) => {
      if (ev.type === 'message.created') {
        const msg = ev.payload.message as MessagePublic
        setChats((prev) => {
          const updated = prev.map((c) => c.id === msg.chat_id
            ? { ...c, last_message: msg, unread_count: c.id === openChatId ? 0 : c.unread_count + 1, updated_at: msg.created_at }
            : c)
          return updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        })
      }
      if (ev.type === 'chat.updated') {
        const chat = ev.payload.chat as ChatSummary
        setChats((prev) => {
          const exists = prev.some((c) => c.id === chat.id)
          const updated = exists ? prev.map((c) => c.id === chat.id ? chat : c) : [chat, ...prev]
          return updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        })
      }
      if (ev.type === 'chat.created') {
        const chat = ev.payload.chat as ChatSummary
        setChats((prev) => {
          const exists = prev.some((c) => c.id === chat.id)
          if (exists) return prev
          return [chat, ...prev].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        })
      }
    })
    return off
  }, [openChatId])

  const filtered = chats.filter((c) => (c.title ?? '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      <div style={{ padding: '1rem 1rem 0.75rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>{t.chats}</h1>
          <button onClick={() => setShowModal(true)} style={{ border: 'none', background: 'var(--gradient)', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <Plus size={18} />
          </button>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input-field" placeholder={t.searchChats} value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem', padding: '0.6rem 0.75rem 0.6rem 2.25rem', fontSize: '0.875rem' }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && (
          <div style={{ padding: '1rem' }}>
            {[1,2,3].map((i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', alignItems: 'center' }}>
                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 12, width: '80%' }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><Search size={28} color="var(--text-muted)" /></div>
            <span style={{ fontSize: '0.85rem' }}>{t.noChatsYet}</span>
          </div>
        )}
        {filtered.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onOpen(chat)}
            style={{
              width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: openChatId === chat.id ? 'rgba(132,36,123,0.06)' : 'var(--surface)',
              border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border)', textAlign: 'left',
              transition: 'background var(--duration) var(--ease)',
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: avatarColor(chat.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
              {chat.avatar_url ? <img src={chat.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(chat.title)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }} className="truncate">{chat.title ?? 'Chat'}</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {chat.last_message ? formatTime(chat.last_message.created_at, useSettingsStore.getState().t) : ''}
                </span>
              </div>
              <div className="truncate" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                {chat.last_message?.text ?? t.noMessages}
              </div>
            </div>
            {chat.unread_count > 0 && (
              <div style={{ minWidth: 20, height: 20, borderRadius: 10, background: 'var(--gradient)', color: 'white', fontSize: '0.62rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>
                {chat.unread_count > 99 ? '99+' : chat.unread_count}
              </div>
            )}
          </button>
        ))}
      </div>

      {showModal && (
        <CreateChatModal
          onClose={() => { setShowModal(false); load() }}
          onCreated={(chatId) => { load(); onOpenChat?.(chatId) }}
        />
      )}
    </div>
  )
}

/* ── Main ChatsPage ──────────────────────────────────────────── */
export default function ChatsPage() {
  const { openChatId, setOpenChat } = useAppStore()
  const { t } = useSettingsStore()
  const isDesktop = useIsDesktop()
  const [localChat, setLocalChat] = useState<ChatSummary | null>(null)
  const [allChats, setAllChats] = useState<ChatSummary[]>([])

  useEffect(() => {
    if (!openChatId) return
    if (localChat?.id === openChatId) return
    const found = allChats.find((c) => c.id === openChatId)
    if (found) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalChat(found)
      return
    }
    getChatDetail(openChatId).then((d) => setLocalChat(d as ChatSummary)).catch(() => {})
  }, [openChatId, localChat?.id, allChats])

  const openChat = localChat

  const handleOpen = (chat: ChatSummary) => {
    setLocalChat(chat)
    setOpenChat(chat.id)
  }

  const handleBack = () => {
    setLocalChat(null)
    setOpenChat(null)
  }

  const handleChatDeleted = () => {
    setLocalChat(null)
    setOpenChat(null)
  }

  if (isDesktop) {
    return (
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid var(--border)' }}>
          <ChatListPanel onOpen={handleOpen} openChatId={openChatId} onChatsLoaded={setAllChats} onOpenChat={(chatId) => setOpenChat(chatId)} />
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {openChat ? (
            <ChatView chat={openChat} allChats={allChats} onBack={handleBack} isDesktop={true} onChatDeleted={handleChatDeleted} />
          ) : (
            <div className="empty-state" style={{ height: '100%' }}>
              <div className="empty-state-icon">
                <div style={{ background: 'var(--gradient)', borderRadius: 'var(--radius-full)', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
              </div>
              <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)' }}>{t.selectChat}</p>
              <p style={{ fontSize: '0.85rem' }}>{t.noChatsYet}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (openChat) {
    return <ChatView chat={openChat} allChats={allChats} onBack={handleBack} isDesktop={false} onChatDeleted={handleChatDeleted} />
  }

  return <ChatListPanel onOpen={handleOpen} openChatId={null} onChatsLoaded={setAllChats} onOpenChat={(chatId) => setOpenChat(chatId)} />
}
