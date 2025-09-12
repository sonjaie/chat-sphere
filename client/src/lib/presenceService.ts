import { supabase } from './supabase'
import { AuthService } from './auth'

export interface PresenceUser {
  user_id: string
  status: 'online' | 'offline' | 'away'
  last_seen: string
}

/**
 * Real-time presence service using Supabase Broadcast and database updates.
 * Tracks user online/offline status and handles browser events.
 */
export class PresenceService {
  private static channels = new Map<string, ReturnType<typeof supabase.channel>>()
  private static currentUserId: string | null = null
  private static heartbeatInterval: NodeJS.Timeout | null = null
  private static isOnline = true
  private static lastHeartbeat = 0
  private static readonly HEARTBEAT_INTERVAL = 30000 // 30 seconds
  private static readonly OFFLINE_TIMEOUT = 60000 // 1 minute

  /**
   * Initialize presence tracking for the current user
   */
  static async initialize(userId: string) {
    this.currentUserId = userId
    
    // Set user as online
    await this.setOnline()
    
    // Start heartbeat
    this.startHeartbeat()
    
    // Set up browser event listeners
    this.setupBrowserEventListeners()
    
    // Set up global presence channel
    this.setupPresenceChannel()
  }

  /**
   * Clean up presence tracking
   */
  static async cleanup() {
    if (this.currentUserId) {
      await this.setOffline()
    }
    
    this.stopHeartbeat()
    this.removeBrowserEventListeners()
    this.cleanupChannels()
    
    this.currentUserId = null
  }

  /**
   * Set user status to online
   */
  static async setOnline() {
    if (!this.currentUserId) return
    
    try {
      await AuthService.updateUserStatus(this.currentUserId, 'online')
      this.broadcastPresence('online')
      this.isOnline = true
      this.lastHeartbeat = Date.now()
    } catch (error) {
      console.error('Failed to set user online:', error)
    }
  }

  /**
   * Set user status to offline
   */
  static async setOffline() {
    if (!this.currentUserId) return
    
    try {
      await AuthService.updateUserStatus(this.currentUserId, 'offline')
      this.broadcastPresence('offline')
      this.isOnline = false
    } catch (error) {
      console.error('Failed to set user offline:', error)
    }
  }

  /**
   * Set user status to away
   */
  static async setAway() {
    if (!this.currentUserId) return
    
    try {
      await AuthService.updateUserStatus(this.currentUserId, 'away')
      this.broadcastPresence('away')
      this.isOnline = false
    } catch (error) {
      console.error('Failed to set user away:', error)
    }
  }

  /**
   * Start heartbeat to maintain online status
   */
  private static startHeartbeat() {
    this.stopHeartbeat() // Clear any existing heartbeat
    
    this.heartbeatInterval = setInterval(async () => {
      if (this.currentUserId && this.isOnline) {
        try {
          await AuthService.updateUserStatus(this.currentUserId, 'online')
          this.broadcastPresence('online')
          this.lastHeartbeat = Date.now()
        } catch (error) {
          console.error('Heartbeat failed:', error)
        }
      }
    }, this.HEARTBEAT_INTERVAL)
  }

  /**
   * Stop heartbeat
   */
  private static stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Set up browser event listeners for visibility and beforeunload
   */
  private static setupBrowserEventListeners() {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    
    // Handle page unload (browser close, refresh, navigation)
    window.addEventListener('beforeunload', this.handleBeforeUnload)
    
    // Handle focus/blur events
    window.addEventListener('focus', this.handleFocus)
    window.addEventListener('blur', this.handleBlur)
  }

  /**
   * Remove browser event listeners
   */
  private static removeBrowserEventListeners() {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    window.removeEventListener('beforeunload', this.handleBeforeUnload)
    window.removeEventListener('focus', this.handleFocus)
    window.removeEventListener('blur', this.handleBlur)
  }

  /**
   * Handle page visibility change
   */
  private static handleVisibilityChange = () => {
    if (document.hidden) {
      // Page is hidden, set to away
      this.setAway()
    } else {
      // Page is visible, set to online
      this.setOnline()
    }
  }

  /**
   * Handle before page unload
   */
  private static handleBeforeUnload = () => {
    // Broadcast offline status immediately
    this.broadcastPresence('offline')
    
    // Try to update database (may not complete due to page unload)
    if (this.currentUserId) {
      // Use sendBeacon if available for more reliable delivery
      if (navigator.sendBeacon) {
        const data = JSON.stringify({
          userId: this.currentUserId,
          status: 'offline',
          timestamp: new Date().toISOString()
        })
        
        // Send to Supabase REST API
        navigator.sendBeacon(
          `${supabase.supabaseUrl}/rest/v1/users?id=eq.${this.currentUserId}`,
          data
        )
      }
    }
  }

  /**
   * Handle window focus
   */
  private static handleFocus = () => {
    this.setOnline()
  }

  /**
   * Handle window blur
   */
  private static handleBlur = () => {
    // Don't immediately set to away on blur, wait a bit
    setTimeout(() => {
      if (!document.hasFocus()) {
        this.setAway()
      }
    }, 5000) // 5 second delay
  }

  /**
   * Set up global presence channel for real-time updates
   */
  private static setupPresenceChannel() {
    const channel = supabase.channel('presence', {
      config: { broadcast: { ack: true } }
    })

    channel
      .on('broadcast', { event: 'presence' }, (payload) => {
        // Handle presence updates from other users
        const { user_id, status, last_seen } = payload.payload as PresenceUser
        
        // Emit custom event for components to listen to
        window.dispatchEvent(new CustomEvent('presenceUpdate', {
          detail: { user_id, status, last_seen }
        }))
      })
      .subscribe()

    this.channels.set('presence', channel)
  }

  /**
   * Broadcast presence status to other users
   */
  private static broadcastPresence(status: 'online' | 'offline' | 'away') {
    if (!this.currentUserId) return
    
    const channel = this.channels.get('presence')
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'presence',
        payload: {
          user_id: this.currentUserId,
          status,
          last_seen: new Date().toISOString()
        }
      })
    }
  }

  /**
   * Subscribe to presence updates for a specific user
   */
  static subscribeToUserPresence(
    userId: string,
    onPresenceUpdate: (presence: PresenceUser) => void
  ) {
    const channel = supabase.channel(`presence:${userId}`, {
      config: { broadcast: { ack: true } }
    })

    channel
      .on('broadcast', { event: 'presence' }, (payload) => {
        const presence = payload.payload as PresenceUser
        if (presence.user_id === userId) {
          onPresenceUpdate(presence)
        }
      })
      .subscribe()

    this.channels.set(`presence:${userId}`, channel)

    return () => {
      supabase.removeChannel(channel)
      this.channels.delete(`presence:${userId}`)
    }
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
}
