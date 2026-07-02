import { getTokens } from '../api/client'

const WS_BASE = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/api/v1/ws'

export interface WsEvent {
  type: string
  payload: Record<string, unknown>
}

type Handler = (event: WsEvent) => void

class SocketManager {
  private ws: WebSocket | null = null
  private handlers = new Set<Handler>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private shouldReconnect = false
  private retryCount = 0
  private readonly MAX_RETRIES = 10
  private readonly BASE_DELAY = 1000

  connect() {
    const { access } = getTokens()
    if (!access || this.ws?.readyState === WebSocket.OPEN) return
    this.shouldReconnect = true
    this.retryCount = 0
    this._open(access)
  }

  private _open(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return
    this.ws = new WebSocket(`${WS_BASE}?token=${token}`)

    this.ws.onopen = () => {
      this.retryCount = 0
    }

    this.ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as WsEvent
        this.handlers.forEach((h) => h(event))
      } catch {
        // ignore malformed frames
      }
    }

    this.ws.onclose = () => {
      if (this.shouldReconnect && this.retryCount < this.MAX_RETRIES) {
        const delay = Math.min(this.BASE_DELAY * Math.pow(2, this.retryCount), 30000)
        this.retryCount++
        this.reconnectTimer = setTimeout(() => {
          const { access } = getTokens()
          if (access) this._open(access)
        }, delay)
      }
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  disconnect() {
    this.shouldReconnect = false
    this.retryCount = 0
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
  }

  send(type: string, payload: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }))
      return true
    }
    return false
  }

  on(handler: Handler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export const socket = new SocketManager()
