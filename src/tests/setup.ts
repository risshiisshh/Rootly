// Global test setup
import '@testing-library/jest-dom'
import { vi, beforeAll, afterAll } from 'vitest'

// Mock localStorage and scrollIntoView globally
if (typeof window !== 'undefined') {
  const mockStorage: Record<string, string> = {}
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, val: string) => { mockStorage[key] = val }),
      removeItem: vi.fn((key: string) => { delete mockStorage[key] }),
      clear: vi.fn(() => { for (const k in mockStorage) delete mockStorage[k] }),
    },
    writable: true,
  })
}

// Mock scrollIntoView for JSDOM elements
try {
  if (typeof HTMLElement !== 'undefined') HTMLElement.prototype.scrollIntoView = vi.fn()
  if (typeof Element !== 'undefined') Element.prototype.scrollIntoView = vi.fn()
} catch (e) {
  // Ignore
}

// Mock Firebase modules for unit tests
vi.mock('@/services/firebase', () => ({
  auth: { currentUser: null, onAuthStateChanged: vi.fn() },
  db: {},
  app: {},
  isFirebaseConfigured: false,
}))

vi.mock('@/services/firestore', () => ({
  getUserActivities: vi.fn().mockResolvedValue([]),
  createActivity: vi.fn().mockResolvedValue('mock-id'),
  deleteActivity: vi.fn().mockResolvedValue(undefined),
  getWeeklyActivities: vi.fn().mockResolvedValue([]),
  getUserGoals: vi.fn().mockResolvedValue([]),
  createGoal: vi.fn().mockResolvedValue('mock-goal-id'),
  updateGoal: vi.fn().mockResolvedValue(undefined),
  deleteGoal: vi.fn().mockResolvedValue(undefined),
  getLatestWeeklyReport: vi.fn().mockResolvedValue(null),
  getUserVoiceLogs: vi.fn().mockResolvedValue([]),
  getUserRouteComparisons: vi.fn().mockResolvedValue([]),
  getUser: vi.fn().mockResolvedValue({ uid: 'demo-user-id', displayName: 'Eco Explorer' }),
  createUser: vi.fn().mockResolvedValue(undefined),
  updateUser: vi.fn().mockResolvedValue(undefined),
  getOrCreateConversation: vi.fn().mockResolvedValue('mock-conv-123'),
  saveChatMessage: vi.fn().mockResolvedValue('mock-msg-123'),
  getChatMessages: vi.fn().mockResolvedValue([]),
}))

// Suppress console.error for expected errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning:')) return
    originalError(...args)
  }
})

afterAll(() => {
  console.error = originalError
})
