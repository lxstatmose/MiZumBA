import type { Lang, Translations } from '../i18n'

type ErrorKey = keyof Translations['errors']

const EXACT: Record<string, ErrorKey> = {
  'Request failed': 'requestFailed',
  'Error': 'unknown',
  'Could not validate credentials': 'unauthorized',
  'Invalid email or password': 'invalidCredentials',
  'User is inactive': 'userInactive',
  'User with this email already exists': 'emailExists',
  'User with this username already exists': 'usernameExists',
  'Invalid or expired token': 'invalidToken',
  'Invalid token type': 'invalidTokenType',
  'Current password is incorrect': 'wrongPassword',
  'Invalid OAuth token': 'invalidOAuthToken',
  'Invalid Google token': 'invalidGoogleToken',
  'Invalid Google token audience': 'invalidGoogleToken',
  'Google token does not contain email': 'invalidGoogleToken',
  'Invalid Apple token audience': 'invalidAppleToken',
  'Apple token does not contain email': 'invalidAppleToken',
  'Too many requests': 'tooManyRequests',
  'This file type is not allowed': 'fileTypeNotAllowed',
  'Only JPEG, PNG, WEBP and GIF images are allowed': 'imageTypeNotAllowed',
  'Only MP3, MP4, WAV, WEBM, OGG, AAC and M4A audio files are allowed': 'audioTypeNotAllowed',
  'Forbidden': 'forbidden',
  'Not found': 'notFound',
  'You cannot interact with this user': 'cannotInteract',
  'This user does not accept direct messages': 'cannotMessageUser',
  'Cannot create direct chat with yourself': 'directChatWithSelf',
  'User not found': 'userNotFound',
  'Chat not found': 'chatNotFound',
  'Message not found': 'messageNotFound',
  'Channel not found': 'channelNotFound',
  'Notification not found': 'notFound',
  'Channel slug is invalid': 'channelSlugInvalid',
  'Channel with this slug already exists': 'channelSlugExists',
  'Cannot add members to direct chat': 'cannotAddToDirectChat',
  'User is already a chat member': 'alreadyMember',
  'Cannot remove members from direct chat': 'cannotRemoveFromDirectChat',
  'Cannot update direct chat': 'cannotUpdateDirectChat',
  'Cannot delete direct chat': 'cannotDeleteDirectChat',
  'Cannot leave direct chat': 'cannotLeaveDirectChat',
  'Owner cannot leave. Transfer ownership or delete the group.': 'ownerCannotLeave',
  'Cannot change roles in direct chat': 'cannotChangeRolesDirect',
  'Cannot change your own role': 'cannotChangeOwnRole',
  'Only sender can edit message': 'onlySenderCanEdit',
  'Only sender can delete message': 'onlySenderCanDelete',
  'Emoji is required': 'emojiRequired',
  'You are not a member of this chat': 'notChatMember',
  'Only chat admins can perform this action': 'adminOnly',
  'Only the chat owner can delete the group': 'ownerOnly',
  'Cannot block yourself': 'cannotBlockSelf',
  'Upload failed': 'uploadFailed',
  'Whisper transcription is disabled': 'transcriptionDisabled',
}

export function localizeError(message: string, t: Translations, lang: Lang): string {
  const trimmed = message.trim()
  const key = EXACT[trimmed]
  if (key) return t.errors[key]

  if (trimmed.startsWith('File is too large')) return t.errors.fileTooLarge
  if (trimmed.startsWith('User ') && trimmed.endsWith(' not found')) return t.errors.userNotFound

  return lang === 'ru' ? t.errors.unknown : trimmed
}
