import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock Firebase Admin
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  cert: vi.fn(),
}))

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: vi.fn(async (token: string) => {
      if (token === 'valid-token') {
        return { uid: 'test-user-id', email: 'test@rootly.green' }
      }
      throw new Error('Invalid token')
    }),
  }),
}))

import { analyticsTracker } from '@/lib/analytics'
import { useAuthStore } from '@/store/userStore'
import { analyticsRepository } from '@/backend/features/analytics/analytics.repository'
import { analyticsController } from '@/backend/features/analytics/analytics.controller'
import { NextRequest } from 'next/server'

describe('Product Analytics Tracking Suite', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.getState().reset()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response)
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe('Client-side AnalyticsTracker', () => {
    it('sanitizes PII from event metadata', () => {
      const tracker = analyticsTracker as any
      const rawMeta = {
        email: 'user@example.com',
        displayName: 'John Doe',
        transcript: 'This is a secret message',
        otherData: 'safe-public-data',
      }
      const sanitized = tracker.sanitizeMetadata(rawMeta)
      expect(sanitized.email).toBeUndefined()
      expect(sanitized.displayName).toBeUndefined()
      expect(sanitized.transcript).toBeUndefined()
      expect(sanitized.otherData).toBe('safe-public-data')
    })

    it('hashes user IDs asynchronously for anonymity', async () => {
      const tracker = analyticsTracker as any
      const hashed = await tracker.hashUid('demo-user-id')
      expect(hashed).toBeDefined()
      expect(hashed).not.toBe('demo-user-id')
      expect(hashed.length).toBeGreaterThan(5)
    })

    it('queues events and flushes when batch limit is reached', async () => {
      const tracker = analyticsTracker as any
      tracker.queue = []
      
      // Setup mock auth user
      useAuthStore.getState().setUserProfile({
        uid: 'user-123',
        displayName: 'Test User',
        email: 'test@rootly.green',
        photoURL: null,
        carbonScore: 75,
        totalEmissionsKg: 10,
        weeklyGoalKg: 100,
        createdAt: {} as any,
        updatedAt: {} as any,
      })

      // Track 4 events (less than BATCH_SIZE = 5)
      tracker.track('USER_LOGIN')
      tracker.track('ACTIVITY_LOGGED')
      tracker.track('CHAT_USAGE')
      tracker.track('ROUTE_COMPARISON')

      // Wait a moment for async hashing promises to resolve
      await new Promise((resolve) => setTimeout(resolve, 50))
      
      expect(tracker.queue.length).toBe(4)
      expect(global.fetch).not.toHaveBeenCalled()

      // Track 5th event (reaches batch size, triggers flush)
      tracker.track('GOAL_COMPLETION')
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(tracker.queue.length).toBe(0)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Backend AnalyticsRepository & Aggregation', () => {
    it('aggregates daily and user daily event counts correctly', async () => {
      const mockEvents = [
        { type: 'USER_LOGIN' as const, timestamp: Date.now(), hashedUid: 'hash-abc', metadata: {} },
        { type: 'ACTIVITY_LOGGED' as const, timestamp: Date.now(), hashedUid: 'hash-abc', metadata: {} },
        { type: 'CHAT_USAGE' as const, timestamp: Date.now(), hashedUid: 'hash-xyz', metadata: {} },
        { type: 'ACTIVITY_LOGGED' as const, timestamp: Date.now(), hashedUid: 'hash-abc', metadata: {} },
      ]

      await analyticsRepository.saveBatch(mockEvents)

      const dailyMetrics = await analyticsRepository.getDailyMetrics()
      const todayStr = new Date().toISOString().split('T')[0]
      const todayMetric = dailyMetrics.find((m) => m.date === todayStr)

      expect(todayMetric).toBeDefined()
      expect(todayMetric?.counts['USER_LOGIN']).toBeGreaterThanOrEqual(1)
      expect(todayMetric?.counts['ACTIVITY_LOGGED']).toBeGreaterThanOrEqual(2)
      expect(todayMetric?.counts['CHAT_USAGE']).toBeGreaterThanOrEqual(1)
      expect(todayMetric?.uniqueUsers).toContain('hash-abc')
      expect(todayMetric?.uniqueUsers).toContain('hash-xyz')
    })
  })

  describe('Backend AnalyticsController Routes', () => {
    it('handles event tracking and validates inputs using Zod', async () => {
      const mockEvents = [
        { type: 'USER_LOGIN', timestamp: Date.now(), hashedUid: 'hash-123', metadata: {} },
        { type: 'GOAL_COMPLETION', timestamp: Date.now(), hashedUid: 'hash-123', metadata: {} },
      ]

      const req = new NextRequest('http://localhost/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({ events: mockEvents }),
      })

      const res = await analyticsController.handleTrack(req)
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it('rejects event tracking with invalid schemas (400 Bad Request)', async () => {
      const invalidPayload = {
        events: [
          { type: 'INVALID_EVENT_TYPE', timestamp: 'not-a-timestamp', hashedUid: 123 },
        ],
      }

      const req = new NextRequest('http://localhost/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(invalidPayload),
      })

      const res = await analyticsController.handleTrack(req)
      expect(res.status).toBe(400)
    })

    it('provides daily metrics for analytics dashboard', async () => {
      const req = new NextRequest('http://localhost/api/analytics', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      })

      const res = await analyticsController.handleGetMetrics(req)
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.dailyMetrics).toBeDefined()
      expect(Array.isArray(data.dailyMetrics)).toBe(true)
    })
  })
})
