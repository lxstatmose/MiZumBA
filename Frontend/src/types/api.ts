export interface UserPublic {
  id: string
  email: string
  username: string | null
  display_name: string
  avatar_url: string | null
  bio: string | null
  is_verified: boolean
  is_online: boolean
  last_seen_at: string | null
  created_at: string
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface AuthResponse {
  user: UserPublic
  tokens: TokenPair
  email_confirmation_token: string | null
}

export type MessageType = 'text' | 'image' | 'audio' | 'file' | 'system'

export interface MessagePublic {
  id: string
  chat_id: string
  sender_id: string
  sender: UserPublic | null
  text: string
  type: MessageType
  attachment_url: string | null
  attachment_mime_type: string | null
  attachment_name: string | null
  attachment_size: number | null
  reply_to_id: string | null
  created_at: string
  updated_at: string
  edited_at: string | null
  deleted_at: string | null
}

export type ChatType = 'direct' | 'group'
export type ChatMemberRole = 'owner' | 'admin' | 'member'

export interface ChatSummary {
  id: string
  type: ChatType
  title: string | null
  avatar_url: string | null
  last_message: MessagePublic | null
  unread_count: number
  members_count: number
  updated_at: string
}

export interface ChatMemberPublic {
  user: UserPublic
  role: ChatMemberRole
  joined_at: string
  last_read_at: string | null
  muted: boolean
}

export interface ChatDetail extends ChatSummary {
  members: ChatMemberPublic[]
}

export interface ChannelPostPublic {
  id: string
  channel_id: string
  author_id: string
  author: UserPublic | null
  text: string
  image_url: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ChannelSummary {
  id: string
  title: string
  slug: string
  description: string
  cover_url: string | null
  category: string
  is_public: boolean
  is_subscribed: boolean
  current_user_role: string | null
  subscribers_count: number
  last_post: ChannelPostPublic | null
  created_at: string
  updated_at: string
}

export interface ChannelSubscriberPublic {
  user: UserPublic
  role: string
  subscribed_at: string
  muted: boolean
}

export interface ChannelDetail extends ChannelSummary {
  subscribers: ChannelSubscriberPublic[]
}

export interface NotificationPublic {
  id: string
  user_id: string
  actor_id: string | null
  actor: UserPublic | null
  chat_id: string | null
  message_id: string | null
  type: string
  title: string
  body: string
  payload: Record<string, unknown>
  is_read: boolean
  created_at: string
}

export interface NotificationListResponse {
  items: NotificationPublic[]
  unread_count: number
}

export interface ProfileStats {
  messages_count: number
  groups_count: number
  channels_count: number
}

export interface UserProfile {
  user: UserPublic
  stats: ProfileStats
}
