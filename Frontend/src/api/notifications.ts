import { apiFetch } from './client'
import type { NotificationListResponse, NotificationPublic } from '../types/api'

export const listNotifications = (limit = 50) =>
  apiFetch<NotificationListResponse>(`/notifications?limit=${limit}`)

export const markAllRead = () =>
  apiFetch<{ message: string }>('/notifications/read-all', { method: 'POST' })

export const markNotificationRead = (id: string) =>
  apiFetch<NotificationPublic>(`/notifications/${id}/read`, { method: 'POST' })

export const deleteNotification = (id: string) =>
  apiFetch<{ message: string }>(`/notifications/${id}`, { method: 'DELETE' })
