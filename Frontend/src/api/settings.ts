import { apiFetch } from './client'

export interface PrivacySettings {
  user_id: string
  direct_messages: 'everyone' | 'nobody'
  show_online_status: boolean
  updated_at: string
}

export interface NotificationSettings {
  user_id: string
  new_messages: boolean
  mentions: boolean
  reactions: boolean
  group_invites: boolean
  channel_updates: boolean
  updated_at: string
}

export interface BlockedUser {
  id: string
  blocked_user: import('../types/api').UserPublic
  created_at: string
}

export const getPrivacy = () =>
  apiFetch<PrivacySettings>('/settings/privacy')

export const updatePrivacy = (params: Partial<Pick<PrivacySettings, 'direct_messages' | 'show_online_status'>>) =>
  apiFetch<PrivacySettings>('/settings/privacy', {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

export const getNotificationSettings = () =>
  apiFetch<NotificationSettings>('/settings/notifications')

export const updateNotificationSettings = (params: Partial<Omit<NotificationSettings, 'user_id' | 'updated_at'>>) =>
  apiFetch<NotificationSettings>('/settings/notifications', {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

export const getBlockedUsers = () =>
  apiFetch<BlockedUser[]>('/settings/blocks')

export const blockUser = (user_id: string) =>
  apiFetch<{ message: string }>(`/settings/blocks/${user_id}`, { method: 'POST' })

export const unblockUser = (user_id: string) =>
  apiFetch<{ message: string }>(`/settings/blocks/${user_id}`, { method: 'DELETE' })
