import { apiFetch } from './client'
import type { ChannelSummary, ChannelDetail, ChannelPostPublic } from '../types/api'

export const listChannels = (query?: string, category?: string) => {
  const params = new URLSearchParams()
  if (query) params.set('query', query)
  if (category) params.set('category', category)
  const qs = params.toString()
  return apiFetch<ChannelSummary[]>(`/channels${qs ? `?${qs}` : ''}`)
}

export const createChannel = (params: {
  title: string
  description?: string
  slug?: string
  is_public: boolean
}) =>
  apiFetch<ChannelDetail>('/channels', {
    method: 'POST',
    body: JSON.stringify({
      title: params.title,
      description: params.description ?? '',
      slug: params.slug,
      is_public: params.is_public,
    }),
  })

export const getChannel = (channel_id: string) =>
  apiFetch<ChannelDetail>(`/channels/${channel_id}`)

export const updateChannel = (channel_id: string, patch: {
  title?: string
  description?: string
  cover_url?: string | null
  is_public?: boolean
}) =>
  apiFetch<ChannelDetail>(`/channels/${channel_id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })

export const deleteChannel = (channel_id: string) =>
  apiFetch<void>(`/channels/${channel_id}`, { method: 'DELETE' })

export const subscribeChannel = (channel_id: string) =>
  apiFetch<ChannelDetail>(`/channels/${channel_id}/subscribe`, { method: 'POST' })

export const unsubscribeChannel = (channel_id: string) =>
  apiFetch<ChannelSummary>(`/channels/${channel_id}/subscribe`, { method: 'DELETE' })

export const getChannelPosts = (channel_id: string) =>
  apiFetch<ChannelPostPublic[]>(`/channels/${channel_id}/posts`)

export const createPost = (channel_id: string, text: string) =>
  apiFetch<ChannelPostPublic>(`/channels/${channel_id}/posts`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })

export const editPost = (channel_id: string, post_id: string, text: string) =>
  apiFetch<ChannelPostPublic>(`/channels/${channel_id}/posts/${post_id}`, {
    method: 'PATCH',
    body: JSON.stringify({ text }),
  })

export const deletePost = (channel_id: string, post_id: string) =>
  apiFetch<void>(`/channels/${channel_id}/posts/${post_id}`, { method: 'DELETE' })
