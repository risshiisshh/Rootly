import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

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

// Import handlers
import { POST as chatPOST } from '../../app/api/chat/route'
import { POST as reportsPOST } from '../../app/api/reports/route'
import { POST as routesPOST } from '../../app/api/routes/route'
import { POST as routesComparePOST } from '../../app/api/routes/compare/route'
import { POST as voicePOST } from '../../app/api/voice/route'
import { POST as activityPOST, GET as activityGET } from '../../app/api/activity/route'
import { POST as goalsPOST, GET as goalsGET } from '../../app/api/goals/route'

describe('Backend QA Audit & Security Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication Enforcement Check (401 Unauthorized)', () => {
    const endpoints = [
      { name: 'POST /api/chat', handler: chatPOST, method: 'POST', body: { message: 'hi' } },
      { name: 'POST /api/reports', handler: reportsPOST, method: 'POST', body: { uid: 'test-user-id' } },
      { name: 'POST /api/routes', handler: routesPOST, method: 'POST', body: { origin: 'A', destination: 'B' } },
      { name: 'POST /api/routes/compare', handler: routesComparePOST, method: 'POST', body: { origin: 'A', destination: 'B' } },
      { name: 'POST /api/voice', handler: voicePOST, method: 'POST', body: { transcript: 'hi' } },
      { name: 'POST /api/activity', handler: activityPOST, method: 'POST', body: { activity: 'car', category: 'transport', quantity: 50, emission: 10 } },
      { name: 'GET /api/activity', handler: activityGET, method: 'GET', body: null },
      { name: 'POST /api/goals', handler: goalsPOST, method: 'POST', body: { title: 'Commute', category: 'transport', targetReductionKg: 10, deadline: new Date(Date.now() + 86400000) } },
      { name: 'GET /api/goals', handler: goalsGET, method: 'GET', body: null },
    ]

    for (const ep of endpoints) {
      it(`enforces bearer token authentication for ${ep.name}`, async () => {
        const req = new NextRequest(`http://localhost:3000${ep.name.split(' ')[1]}`, {
          method: ep.method,
          headers: {
            // Missing auth header
          },
          body: ep.body ? JSON.stringify(ep.body) : undefined,
        })
        const res = await ep.handler(req)
        expect(res.status).toBe(401)
        const data = await res.json()
        expect(data.code).toBe('UNAUTHORIZED')
      })

      it(`rejects invalid bearer token for ${ep.name}`, async () => {
        const req = new NextRequest(`http://localhost:3000${ep.name.split(' ')[1]}`, {
          method: ep.method,
          headers: {
            'authorization': 'Bearer fake-invalid-token',
          },
          body: ep.body ? JSON.stringify(ep.body) : undefined,
        })
        const res = await ep.handler(req)
        expect(res.status).toBe(401)
      })
    }
  })

  describe('Input Boundary Validation (400 Bad Request)', () => {
    it('rejects POST /api/activity with negative emissions values', async () => {
      const req = new NextRequest('http://localhost:3000/api/activity', {
        method: 'POST',
        headers: { 'authorization': 'Bearer valid-token' },
        body: JSON.stringify({
          activity: 'car',
          category: 'transport',
          quantity: 50,
          emission: -15.5,
        }),
      })
      const res = await activityPOST(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('rejects POST /api/activity with missing category', async () => {
      const req = new NextRequest('http://localhost:3000/api/activity', {
        method: 'POST',
        headers: { 'authorization': 'Bearer valid-token' },
        body: JSON.stringify({
          activity: 'car',
          quantity: 50,
          emission: 10,
        }),
      })
      const res = await activityPOST(req)
      expect(res.status).toBe(400)
    })

    it('rejects POST /api/goals with deadline in the past', async () => {
      const req = new NextRequest('http://localhost:3000/api/goals', {
        method: 'POST',
        headers: { 'authorization': 'Bearer valid-token' },
        body: JSON.stringify({
          title: 'Goal in past',
          category: 'energy',
          targetReductionKg: 100,
          deadline: new Date(Date.now() - 3600000).toISOString(),
        }),
      })
      const res = await goalsPOST(req)
      expect(res.status).toBe(400)
    })
  })

  describe('Rate Limiting Enforcement (429 Too Many Requests)', () => {
    it('throttles client requests when exceeding endpoint rate limit thresholds', async () => {
      // Simulate multiple requests exceeding rate limits (25 requests)
      let lastRes: Response | null = null
      for (let i = 0; i < 25; i++) {
        const req = new NextRequest('http://localhost:3000/api/chat', {
          method: 'POST',
          headers: { 'authorization': 'Bearer valid-token' },
          body: JSON.stringify({ message: 'query ' + i, conversationId: 'conv-123' }),
        })
        lastRes = await chatPOST(req)
      }
      expect(lastRes?.status).toBe(429)
      const data = await lastRes?.json()
      expect(data.code).toBe('RATE_LIMIT_EXCEEDED')
    })
  })
})
