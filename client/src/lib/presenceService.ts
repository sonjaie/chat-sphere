import { supabase } from './supabase'

export interface PresenceUser {
  user_id: string
  status: 'online' | 'offline' | 'away'
  last_seen: string
}

/**
 * Presence service backed by Supabase Edge Functions + Postgres realtime.
 * Implements multi-device presence with activity/away/offline semantics.
 */
export class PresenceService {
  private static channels = new Map<string, ReturnType<typeof supabase.channel>>()
  private static currentUserId: string | null = null
  private static deviceId: string | null = null
  private static heartbeatTimer: any = null
  private static activityThrottleAt = 0
  private static isOnline = true // Local UI hint only; server truth in presence_state
  private static readonly HEARTBEAT_INTERVAL = 25000 // 25s
  private static readonly ACTIVITY_THROTTLE = (import.meta.env.VITE_ACTIVITY_THROTTLE_WINDOW ? Number(import.meta.env.VITE_ACTIVITY_THROTTLE_WINDOW) : 30) * 1000
  private static unsubPresenceChanges: (() => void) | null = null

  /**
   * Initialize presence tracking for the current user
   */
  static async initialize(userId: string) {
    this.currentUserId = userId
    this.deviceId = this.getOrCreateDeviceId()

    try {
      // Establish connection
      await this.invoke('presence-connect', { deviceId: this.deviceId })
      // Mark immediate activity to get ONLINE and set TTLs
      await this.invoke('presence-activity', { deviceId: this.deviceId })
      this.isOnline = true
    } catch (e) {
      console.error('Presence initialize failed', e)
    }

    // Start heartbeat and listeners
    this.startHeartbeat()
    this.setupBrowserEventListeners()
    this.subscribePresenceChanges()
  }

  /**
   * Clean up presence tracking
   */
  static async cleanup() {
    try {
      if (this.currentUserId && this.deviceId) {
        await this.invoke('presence-disconnect', { deviceId: this.deviceId })
      }
    } catch (e) {
      // ignore
    }
    this.stopHeartbeat()
    this.removeBrowserEventListeners()
    this.cleanupChannels()
    if (this.unsubPresenceChanges) {
      this.unsubPresenceChanges()
      this.unsubPresenceChanges = null
    }
    this.currentUserId = null
    this.deviceId = null
  }

  /**
   * Set user status to online
   */
  static async setOnline() {
    if (!this.currentUserId || !this.deviceId) return
    try {
      await this.invoke('presence-activity', { deviceId: this.deviceId })
      this.isOnline = true
    } catch (error) {
      console.error('Failed to set user online:', error)
    }
  }

  /**
   * Set user status to offline
   */
  static async setOffline() {
    if (!this.currentUserId || !this.deviceId) return
    try {
      await this.invoke('presence-disconnect', { deviceId: this.deviceId })
      this.isOnline = false
    } catch (error) {
      console.error('Failed to set user offline:', error)
    }
  }

  /**
   * Set user status to away
   */
  static async setAway() {
    // For UX only; server transitions to AWAY upon TTL expiry.
    this.isOnline = false
  }

  /**
   * Start heartbeat to maintain online status
   */
  private static startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(async () => {
      if (!this.currentUserId || !this.deviceId) return
      try {
        await this.invoke('presence-heartbeat', { deviceId: this.deviceId })
      } catch (e) {
        // ignore
      }
    }, this.HEARTBEAT_INTERVAL)
  }

  /**
   * Stop heartbeat
   */
  private static stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /**
   * Set up browser event listeners for visibility and beforeunload
   */
  private static setupBrowserEventListeners() {
    // Page visibility
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    // Unload
    window.addEventListener('beforeunload', this.handleBeforeUnload)
    // Focus/blur
    window.addEventListener('focus', this.handleFocus)
    window.addEventListener('blur', this.handleBlur)
    // User activity
    const activityEvents: (keyof DocumentEventMap | keyof WindowEventMap)[] = [
      'mousemove', 'keydown', 'click', 'scroll', 'touchstart'
    ]
    activityEvents.forEach((evt) => window.addEventListener(evt as any, this.handleActivity, { passive: true }))
  }

  /**
   * Remove browser event listeners
   */
  private static removeBrowserEventListeners() {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    window.removeEventListener('beforeunload', this.handleBeforeUnload)
    window.removeEventListener('focus', this.handleFocus)
    window.removeEventListener('blur', this.handleBlur)
    const activityEvents: (keyof DocumentEventMap | keyof WindowEventMap)[] = [
      'mousemove', 'keydown', 'click', 'scroll', 'touchstart'
    ]
    activityEvents.forEach((evt) => window.removeEventListener(evt as any, this.handleActivity))
  }

  /**
   * Handle page visibility change
   */
  private static handleVisibilityChange = () => {
    if (document.hidden) {
      // Backgrounded; do not change server state immediately
      this.setAway()
    } else {
      this.setOnline()
    }
  }

  /**
   * Handle before page unload
   */
  private static handleBeforeUnload = () => {
    if (!this.currentUserId || !this.deviceId) return
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const url = `${supabaseUrl}/functions/v1/presence-disconnect`
      const payload = JSON.stringify({ deviceId: this.deviceId })
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon(url, blob)
      } else {
        // Best effort
        fetch(url, { method: 'POST', body: payload, keepalive: true, headers: { 'Content-Type': 'application/json' } })
      }
    } catch {
      // ignore
    }
  }

  /**
   * Handle window focus
   */
  private static handleFocus = () => { this.setOnline() }

  /**
   * Handle window blur
   */
  private static handleBlur = () => {
    setTimeout(() => { if (!document.hasFocus()) this.setAway() }, 5000)
  }

  private static handleActivity = () => {
    const now = Date.now()
    if (!this.currentUserId || !this.deviceId) return
    if (now - this.activityThrottleAt < this.ACTIVITY_THROTTLE) return
    this.activityThrottleAt = now
    this.setOnline()
  }

  /**
   * Set up global presence channel for real-time updates
   */
  private static subscribePresenceChanges() {
    // Stream table changes for presence_state; consumers can listen via custom event
    const channel = supabase
      .channel('presence-state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presence_state' }, (payload) => {
        const row = payload.new || payload.old as any
        if (!row) return
        const status = (row.state as string)?.toLowerCase?.() as 'online' | 'offline' | 'away' || 'offline'
        const last_seen = row.last_activity_at || row.changed_at
        window.dispatchEvent(new CustomEvent('presenceUpdate', {
          detail: { user_id: row.user_id, status, last_seen }
        }))
      })
      .subscribe()
    this.channels.set('presence-state', channel)
    this.unsubPresenceChanges = () => {
      supabase.removeChannel(channel)
      this.channels.delete('presence-state')
    }
  }

  /**
   * Broadcast presence status to other users
   */
  // broadcastPresence removed in favor of postgres changes; keep no-op for back-compat
  private static broadcastPresence(_status: 'online' | 'offline' | 'away') { /* no-op */ }

  /**
   * Subscribe to presence updates for a specific user
   */
  static subscribeToUserPresence(
    userId: string,
    onPresenceUpdate: (presence: PresenceUser) => void
  ) {
    const channel = supabase
      .channel(`presence:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presence_state', filter: `user_id=eq.${userId}` }, (payload) => {
        const row = payload.new || payload.old as any
        if (!row) return
        const status = (row.state as string)?.toLowerCase?.() as 'online' | 'offline' | 'away' || 'offline'
        const last_seen = row.last_activity_at || row.changed_at
        onPresenceUpdate({ user_id: userId, status, last_seen })
      })
      .subscribe()
    this.channels.set(`presence:${userId}`, channel)
    return () => { supabase.removeChannel(channel); this.channels.delete(`presence:${userId}`) }
  }

  /**
   * Clean up all channels
   */
  private static cleanupChannels() {
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel)
    })
    this.channels.clear()
  }

  /**
   * Get current user's online status
   */
  static getCurrentStatus(): 'online' | 'offline' | 'away' {
    return this.isOnline ? 'online' : 'offline'
  }

  /**
   * Check if user is currently online
   */
  static isUserOnline(): boolean {
    return this.isOnline
  }

  private static getOrCreateDeviceId(): string {
    const key = 'presence_device_id'
    const existing = localStorage.getItem(key)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(key, id)
    return id
  }

  // Wrapper to safely invoke Edge Functions in environments where functions may be mocked/absent
  private static async invoke(name: string, body?: any) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.warn('No auth session available for Edge Function call')
        return Promise.resolve({ data: null })
      }

      const { data, error } = await supabase.functions.invoke(name, {
        body,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'x-device-id': this.deviceId ?? ''
        },
      })

      if (error) {
        console.error(`Edge Function ${name} error:`, error)
        throw error
      }

      return { data }
    } catch (error) {
      console.error(`Failed to invoke Edge Function ${name}:`, error)
      throw error
    }
  }
}
