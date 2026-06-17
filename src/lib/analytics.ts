import { useAuthStore } from '@/store/userStore'

export type AnalyticsEventType =
  | 'USER_LOGIN'
  | 'ACTIVITY_LOGGED'
  | 'VOICE_LOGGING'
  | 'CHAT_USAGE'
  | 'ROUTE_COMPARISON'
  | 'GOAL_COMPLETION'
  | 'REPORT_GENERATION'
  | 'RECOMMENDATION_ACCEPTANCE'

export interface QueuedEvent {
  type: AnalyticsEventType
  timestamp: number
  hashedUid: string
  metadata?: Record<string, any>
}

class AnalyticsTracker {
  private queue: QueuedEvent[] = []
  private flushTimer: any = null
  private readonly BATCH_SIZE = 5
  private readonly FLUSH_INTERVAL_MS = 15000 // 15 seconds
  private readonly SALT = 'rootly-analytics-salt'

  constructor() {
    if (typeof window !== 'undefined') {
      // Load saved events from localStorage on startup (session recovery)
      try {
        const saved = window.localStorage.getItem('rootly_analytics_queue')
        if (saved) {
          this.queue = JSON.parse(saved)
        }
      } catch (e) {
        // Ignore
      }

      // Add listeners for unloading/hiding to flush remaining events
      window.addEventListener('beforeunload', () => this.flushSync())
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flushSync()
        }
      })

      // Start periodic flush
      this.startTimer()
    }
  }

  private startTimer() {
    this.stopTimer()
    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.FLUSH_INTERVAL_MS)
  }

  private stopTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
  }

  // Helper to hash uid asynchronously using SHA-256 Web Crypto
  private async hashUid(uid: string): Promise<string> {
    if (!uid || uid === 'anonymous') return 'anonymous'
    const salted = uid + this.SALT
    const msgBuffer = new TextEncoder().encode(salted)
    
    // Fallback for environment lacking crypto.subtle (like old/restricted environments)
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      let hash = 0
      for (let i = 0; i < salted.length; i++) {
        hash = (hash << 5) - hash + salted.charCodeAt(i)
        hash |= 0
      }
      return 'hash-' + Math.abs(hash).toString(16)
    }

    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // Strip PII from metadata
  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized = { ...metadata }
    const piiKeys = ['email', 'displayName', 'name', 'password', 'transcript', 'text', 'message', 'content', 'origin', 'destination']
    for (const key of piiKeys) {
      if (key in sanitized) {
        delete sanitized[key]
      }
    }
    return sanitized
  }

  private getUid(): string {
    try {
      if (typeof useAuthStore.getState === 'function') {
        return useAuthStore.getState()?.userProfile?.uid || 'anonymous'
      } else if (typeof useAuthStore === 'function') {
        return (useAuthStore as any)()?.userProfile?.uid || 'anonymous'
      }
    } catch {
      // Ignore
    }
    return 'anonymous'
  }

  private async getFirebaseToken(): Promise<string | null> {
    try {
      if (typeof useAuthStore.getState === 'function') {
        const firebaseUser = useAuthStore.getState()?.firebaseUser
        if (firebaseUser) return await firebaseUser.getIdToken()
      } else if (typeof useAuthStore === 'function') {
        const firebaseUser = (useAuthStore as any)()?.firebaseUser
        if (firebaseUser) return await firebaseUser.getIdToken()
      }
    } catch {
      // Ignore
    }
    return null
  }

  public track(type: AnalyticsEventType, metadata: Record<string, any> = {}) {
    const uid = this.getUid()
    const sanitizedMeta = this.sanitizeMetadata(metadata)

    // Hashing is async, so we do it in a promise context and add to queue
    this.hashUid(uid).then((hashedUid) => {
      const event: QueuedEvent = {
        type,
        timestamp: Date.now(),
        hashedUid,
        metadata: sanitizedMeta,
      }

      this.queue.push(event)
      this.saveToStorage()

      if (this.queue.length >= this.BATCH_SIZE) {
        this.flush()
      }
    }).catch(err => {
      console.error('Failed to hash uid for analytics:', err)
    })
  }

  private saveToStorage() {
    try {
      window.localStorage.setItem('rootly_analytics_queue', JSON.stringify(this.queue))
    } catch (e) {
      // Ignore
    }
  }

  public async flush(): Promise<void> {
    if (this.queue.length === 0) return

    const eventsToFlush = [...this.queue]
    this.queue = []
    this.saveToStorage()

    try {
      const token = await this.getFirebaseToken()

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers,
        body: JSON.stringify({ events: eventsToFlush }),
      })

      if (!res.ok) {
        throw new Error(`Flush failed with status ${res.status}`)
      }
    } catch (err) {
      console.error('Failed to flush analytics queue:', err)
      // Put events back at the front of the queue
      this.queue = [...eventsToFlush, ...this.queue]
      this.saveToStorage()
    }
  }

  // Synchronous flush on page unload using sendBeacon or synchronous fetch if supported
  private flushSync() {
    if (this.queue.length === 0) return

    const eventsToFlush = [...this.queue]
    this.queue = []
    this.saveToStorage()

    const url = '/api/analytics'
    const body = JSON.stringify({ events: eventsToFlush })

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon(url, blob)
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  }
}

export const analyticsTracker = new AnalyticsTracker()
