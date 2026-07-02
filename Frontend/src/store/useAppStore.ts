import { create } from 'zustand'
import { getTokens, clearTokens } from '../api/client'
import type { UserPublic } from '../types/api'

export type Page =
  | 'login' | 'register'
  | 'chats' | 'channels' | 'activity' | 'profile'
  | 'settings-appearance' | 'settings-notifications' | 'settings-privacy' | 'settings-blocked'
  | 'settings-password'

interface AppStore {
  page: Page
  user: UserPublic | null
  openChatId: string | null
  openChannelId: string | null
  unreadNotifications: number
  totalChatUnread: number
  setPage: (p: Page) => void
  setUser: (user: UserPublic | null) => void
  setOpenChat: (id: string | null) => void
  setOpenChannel: (id: string | null) => void
  setUnreadNotifications: (n: number) => void
  setTotalChatUnread: (n: number) => void
  logout: () => void
}

export const useAppStore = create<AppStore>((set) => ({
  page: getTokens().access ? 'chats' : 'login',
  user: null,
  openChatId: null,
  openChannelId: null,
  unreadNotifications: 0,
  totalChatUnread: 0,
  setPage: (page) => set({ page }),
  setUser: (user) => set({ user }),
  setOpenChat: (openChatId) => set({ openChatId }),
  setOpenChannel: (openChannelId) => set({ openChannelId }),
  setUnreadNotifications: (unreadNotifications) => set({ unreadNotifications }),
  setTotalChatUnread: (totalChatUnread) => set({ totalChatUnread }),
  logout: () => {
    clearTokens()
    set({ page: 'login', user: null, openChatId: null, openChannelId: null, totalChatUnread: 0 })
  },
}))
