import { apiFetch, saveTokens, clearTokens, getTokens } from './client'
import type { AuthResponse, TokenPair } from '../types/api'

export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  saveTokens(data.tokens.access_token, data.tokens.refresh_token)
  return data
}

export async function register(params: {
  email: string
  password: string
  display_name: string
  username?: string
}): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(params),
  })
  saveTokens(data.tokens.access_token, data.tokens.refresh_token)
  return data
}

export async function logout(): Promise<void> {
  const { refresh } = getTokens()
  if (refresh) {
    await apiFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refresh }),
    }).catch(() => {})
  }
  clearTokens()
}

export async function refreshTokens(): Promise<TokenPair> {
  const { refresh } = getTokens()
  return apiFetch<TokenPair>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refresh }),
  })
}

export async function changePassword(current_password: string, new_password: string): Promise<void> {
  await apiFetch('/auth/change-password', {
    method: 'PATCH',
    body: JSON.stringify({ current_password, new_password }),
  })
}
