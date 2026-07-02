import { apiFetch } from './client'
import type { ChatSummary, ChatDetail, MessagePublic } from '../types/api'

export const listChats = () =>
  apiFetch<ChatSummary[]>('/chats')

export const createDirectChat = (user_id: string) =>
  apiFetch<ChatDetail>('/chats/direct', {
    method: 'POST',
    body: JSON.stringify({ user_id }),
  })

export const createGroupChat = (title: string, member_ids: string[], avatar_url?: string) =>
  apiFetch<ChatDetail>('/chats/group', {
    method: 'POST',
    body: JSON.stringify({ title, member_ids, avatar_url: avatar_url ?? null }),
  })

export const updateGroupChat = (chat_id: string, title?: string, avatar_url?: string) =>
  apiFetch<ChatDetail>(`/chats/${chat_id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title: title ?? null, avatar_url: avatar_url ?? null }),
  })

export const deleteGroupChat = (chat_id: string) =>
  apiFetch<void>(`/chats/${chat_id}`, { method: 'DELETE' })

export const leaveGroupChat = (chat_id: string) =>
  apiFetch<void>(`/chats/${chat_id}/leave`, { method: 'POST' })

export const getChatDetail = (chat_id: string) =>
  apiFetch<ChatDetail>(`/chats/${chat_id}`)

export const addChatMember = (chat_id: string, user_id: string) =>
  apiFetch<ChatDetail>(`/chats/${chat_id}/members`, {
    method: 'POST',
    body: JSON.stringify({ user_id, role: 'member' }),
  })

export const removeChatMember = (chat_id: string, user_id: string) =>
  apiFetch<ChatDetail>(`/chats/${chat_id}/members/${user_id}`, { method: 'DELETE' })

export const updateMemberRole = (chat_id: string, user_id: string, role: 'admin' | 'member') =>
  apiFetch<ChatDetail>(`/chats/${chat_id}/members/${user_id}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })

export const getMessages = (chat_id: string, limit = 50, before_message_id?: string) => {
  const params = new URLSearchParams({ limit: String(limit) })
  if (before_message_id) params.set('before_message_id', before_message_id)
  return apiFetch<MessagePublic[]>(`/chats/${chat_id}/messages?${params}`)
}

export const sendMessageRest = (
  chat_id: string,
  text: string,
  reply_to_id?: string,
  attachment?: { url: string; mime_type: string; name: string; size: number; type: string },
) =>
  apiFetch<MessagePublic>(`/chats/${chat_id}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      text,
      type: attachment?.type ?? 'text',
      reply_to_id: reply_to_id ?? null,
      attachment_url: attachment?.url ?? null,
      attachment_mime_type: attachment?.mime_type ?? null,
      attachment_name: attachment?.name ?? null,
      attachment_size: attachment?.size ?? null,
    }),
  })

export const markRead = (chat_id: string, message_id?: string) =>
  apiFetch(`/chats/${chat_id}/read`, {
    method: 'POST',
    body: JSON.stringify({ message_id: message_id ?? null }),
  })
