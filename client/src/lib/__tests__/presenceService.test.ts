import { PresenceService } from '../presenceService'

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      send: jest.fn().mockResolvedValue({}),
    })),
    removeChannel: jest.fn(),
    supabaseUrl: 'https://test.supabase.co',
    supabaseKey: 'test-key',
  },
}))

// Mock AuthService
jest.mock('../auth', () => ({
  AuthService: {
    updateUserStatus: jest.fn().mockResolvedValue({}),
  },
}))

describe('PresenceService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock browser APIs
    Object.defineProperty(navigator, 'sendBeacon', {
      writable: true,
      value: jest.fn().mockReturnValue(true),
    })
    
    Object.defineProperty(document, 'hidden', {
      writable: true,
      value: false,
    })
    
    Object.defineProperty(document, 'hasFocus', {
      writable: true,
      value: jest.fn().mockReturnValue(true),
    })
  })

  afterEach(() => {
    // Clean up any timers
    jest.clearAllTimers()
  })

  it('should initialize presence tracking', async () => {
    const userId = 'test-user-id'
    
    await PresenceService.initialize(userId)
    
    expect(PresenceService.isUserOnline()).toBe(true)
    expect(PresenceService.getCurrentStatus()).toBe('online')
  })

  it('should set user online', async () => {
    const userId = 'test-user-id'
    await PresenceService.initialize(userId)
    
    await PresenceService.setOnline()
    
    expect(PresenceService.isUserOnline()).toBe(true)
    expect(PresenceService.getCurrentStatus()).toBe('online')
  })

  it('should set user offline', async () => {
    const userId = 'test-user-id'
    await PresenceService.initialize(userId)
    
    await PresenceService.setOffline()
    
    expect(PresenceService.isUserOnline()).toBe(false)
    expect(PresenceService.getCurrentStatus()).toBe('offline')
  })

  it('should set user away', async () => {
    const userId = 'test-user-id'
    await PresenceService.initialize(userId)
    
    await PresenceService.setAway()
    
    expect(PresenceService.isUserOnline()).toBe(false)
    expect(PresenceService.getCurrentStatus()).toBe('offline')
  })

  it('should cleanup presence tracking', async () => {
    const userId = 'test-user-id'
    await PresenceService.initialize(userId)
    
    await PresenceService.cleanup()
    
    expect(PresenceService.getCurrentStatus()).toBe('offline')
  })

  it('should handle visibility change events', async () => {
    const userId = 'test-user-id'
    await PresenceService.initialize(userId)
    
    // Simulate page becoming hidden
    Object.defineProperty(document, 'hidden', {
      writable: true,
      value: true,
    })
    
    const event = new Event('visibilitychange')
    document.dispatchEvent(event)
    
    // Should set user to away when page is hidden
    expect(PresenceService.getCurrentStatus()).toBe('offline')
  })

  it('should handle beforeunload events', async () => {
    const userId = 'test-user-id'
    await PresenceService.initialize(userId)
    
    const event = new Event('beforeunload')
    window.dispatchEvent(event)
    
    // Should attempt to set user offline
    expect(navigator.sendBeacon).toHaveBeenCalled()
  })
})
