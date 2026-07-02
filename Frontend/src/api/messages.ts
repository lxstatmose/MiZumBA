import { apiFetch } from './client'
import type { MessagePublic } from '../types/api'

export interface ReactionPublic {
  emoji: string
  count: number
  user_ids: string[]
}

export const editMessage = (message_id: string, text: string) =>
  apiFetch<MessagePublic>(`/messages/${message_id}`, {
    method: 'PATCH',
    body: JSON.stringify({ text }),
  })

export const deleteMessage = (message_id: string) =>
  apiFetch<void>(`/messages/${message_id}`, { method: 'DELETE' })

export const addReaction = (message_id: string, emoji: string) =>
  apiFetch<ReactionPublic[]>(`/messages/${message_id}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  })

export const getReactions = (message_id: string) =>
  apiFetch<ReactionPublic[]>(`/messages/${message_id}/reactions`)

export const transcribeMessage = (message_id: string) =>
  apiFetch<MessagePublic>(`/messages/${message_id}/transcribe`, { method: 'POST' })
