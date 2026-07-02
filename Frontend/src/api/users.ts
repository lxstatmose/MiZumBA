import { apiFetch } from './client'
import type { UserPublic, UserProfile } from '../types/api'

export interface SearchItem {
  id: string
  type: 'user' | 'chat' | 'message' | 'channel'
  title: string
  subtitle?: string
  url?: string
}

export interface SearchResponse {
  users: SearchItem[]
  chats: SearchItem[]
  messages: SearchItem[]
  channels: SearchItem[]
}

export const searchUsers = (q: string) =>
  apiFetch<SearchResponse>(`/search?q=${encodeURIComponent(q)}`)

export const getMe = () =>
  apiFetch<UserPublic>('/users/me')

export const getMyProfile = () =>
  apiFetch<UserProfile>('/users/me/profile')

export const updateMe = (params: {
  display_name?: string
  username?: string
  bio?: string
  avatar_url?: string
}) =>
  apiFetch<UserPublic>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

export const getUserById = (user_id: string) =>
  apiFetch<UserPublic>(`/users/${user_id}`)

export const blockUser = (user_id: string) =>
  apiFetch<void>(`/users/${user_id}/block`, { method: 'POST' })
