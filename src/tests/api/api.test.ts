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

// Mock Maps Service
vi.mock('@/services/maps', () => ({
  getRouteOptions: vi.fn().mockResolvedValue({
    options: [
      {
        mode: 'train',
        durationMinutes: 45,
        distanceKm: 25,
        emissionsKg: 1.025,
        estimatedCost: 150,
        isRecommended: true,
        savingsVsCar: 3.775,
        savingsPercentage: 79,
      },
      {
        mode: 'car',
        durationMinutes: 60,
        distanceKm: 25,
        emissionsKg: 4.8,
        estimatedCost: 500,
        isRecommended: false,
        savingsVsCar: 0,
        savingsPercentage: 0,
      }
    ],
    aiReasoning: 'Train is the greenest option for this route, saving 3.8kg of CO2 compared to driving.'
  })
}))

// Mock Firestore Service completely to avoid undefined functions throwing 500s
vi.mock('@/services/firestore', () => ({
  getUser: vi.fn().mockResolvedValue({
    uid: 'test-user-id',
    displayName: 'Eco Tester',
    email: 'test@rootly.green',
    weeklyGoalKg: 100,
    carbonScore: 75,
  }),
  createUser: vi.fn().mockResolvedValue(undefined),
  updateUser: vi.fn().mockResolvedValue(undefined),
  createActivity: vi.fn().mockResolvedValue('act-123'),
  getUserActivities: vi.fn().mockResolvedValue([]),
  getWeeklyActivities: vi.fn().mockResolvedValue([]),
  deleteActivity: vi.fn().mockResolvedValue(undefined),
  createVoiceLog: vi.fn().mockResolvedValue('voice-123'),
  getUserVoiceLogs: vi.fn().mockResolvedValue([]),
  getOrCreateConversation: vi.fn().mockResolvedValue('conv-123'),
  getChatMessages: vi.fn().mockResolvedValue([]),
  saveChatMessage: vi.fn().mockResolvedValue('msg-123'),
  createGoal: vi.fn().mockResolvedValue('goal-123'),
  getUserGoals: vi.fn().mockResolvedValue([]),
  updateGoal: vi.fn().mockResolvedValue(undefined),
  deleteGoal: vi.fn().mockResolvedValue(undefined),
  saveWeeklyReport: vi.fn().mockResolvedValue('report-123'),
  getLatestWeeklyReport: vi.fn().mockResolvedValue(null),
  saveRouteComparison: vi.fn().mockResolvedValue('route-123'),
  getUserRouteComparisons: vi.fn().mockResolvedValue([]),
}))

// Import the endpoint handlers
import { POST as chatPOST } from '../../app/api/chat/route'
import { POST as reportsPOST } from '../../app/api/reports/route'
import { POST as routesPOST } from '../../app/api/routes/route'
import { POST as routesComparePOST } from '../../app/api/routes/compare/route'
import { POST as voicePOST } from '../../app/api/voice/route'

// Seed test mock conversation in chatRepository for api.test.ts to succeed
import { mockConversations } from '@/backend/features/chat/chat.repository'

describe('Next.js REST API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Seed conversation for test-user-id
    const existing = mockConversations.find(c => c.id === 'conv-123')
    if (!existing) {
      mockConversations.push({
        id: 'conv-123',
        userId: 'test-user-id',
        title: 'Test Session',
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
        messageCount: 0,
      })
    }
  })

  describe('Chat API (/api/chat)', () => {
    it('returns 401 when unauthorized or token is invalid', async () => {
      const req = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer invalid-token',
        },
        body: JSON.stringify({ message: 'hi' }),
      })
      const res = await chatPOST(req)
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 400 when message is malformed (Zod fails)', async () => {
      const req = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({ message: '' }), // message is too short
      })
      const res = await chatPOST(req)
      expect(res.status).toBe(400)
    })

    it('returns 200 and AI response on successful request', async () => {
      const req = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({ message: 'Hello, what is my score?', conversationId: 'conv-123' }),
      })
      const res = await chatPOST(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.message).toBeDefined()
      expect(data.conversationId).toBe('conv-123')
    })

    it('triggers 429 rate limit exceeded on multiple requests', async () => {
      // Simulate 25 rapid requests to trigger the rate limiter (limit is 20)
      let finalRes: Response | null = null
      for (let i = 0; i < 25; i++) {
        const req = new NextRequest('http://localhost:3000/api/chat', {
          method: 'POST',
          headers: {
            'authorization': 'Bearer valid-token',
          },
          body: JSON.stringify({ message: 'Hello ' + i, conversationId: 'conv-123' }),
        })
        finalRes = await chatPOST(req)
      }
      expect(finalRes?.status).toBe(429)
      const data = await finalRes?.json()
      expect(data.error).toContain('Rate limit exceeded')
    })
  })

  describe('Reports API (/api/reports)', () => {
    it('returns 400 when User ID is missing in body', async () => {
      const req = new NextRequest('http://localhost:3000/api/reports', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({}),
      })
      const res = await reportsPOST(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('User ID required')
    })

    it('returns 200 with generated report data on success', async () => {
      const req = new NextRequest('http://localhost:3000/api/reports', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({ uid: 'test-user-id' }),
      })
      const res = await reportsPOST(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.report).toBeDefined()
      expect(data.report.userId).toBe('test-user-id')
      expect(data.report.narrative).toBeDefined()
    })
  })

  describe('Routes API (/api/routes and /api/routes/compare)', () => {
    it('returns 400 on malformed input (missing origin)', async () => {
      const req = new NextRequest('http://localhost:3000/api/routes', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({ destination: 'Pune, MH' }),
      })
      const res = await routesPOST(req)
      expect(res.status).toBe(400)

      const compareReq = new NextRequest('http://localhost:3000/api/routes/compare', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({ destination: 'Pune, MH' }),
      })
      const compareRes = await routesComparePOST(compareReq)
      expect(compareRes.status).toBe(400)
    })

    it('returns 200 with options comparison on success', async () => {
      const req = new NextRequest('http://localhost:3000/api/routes', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({ origin: 'Mumbai, MH', destination: 'Pune, MH' }),
      })
      const res = await routesPOST(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.comparison).toBeDefined()
      expect(data.comparison.origin).toBe('Mumbai, MH')
      expect(data.comparison.destination).toBe('Pune, MH')
      expect(data.comparison.options.length).toBeGreaterThan(0)

      const compareReq = new NextRequest('http://localhost:3000/api/routes/compare', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({ origin: 'Mumbai, MH', destination: 'Pune, MH' }),
      })
      const compareRes = await routesComparePOST(compareReq)
      expect(compareRes.status).toBe(200)
      const compareData = await compareRes.json()
      expect(compareData.comparison).toBeDefined()
      expect(compareData.comparison.origin).toBe('Mumbai, MH')
      expect(compareData.comparison.destination).toBe('Pune, MH')
      expect(compareData.comparison.options.length).toBeGreaterThan(0)
    })
  })

  describe('Voice API (/api/voice)', () => {
    it('returns 200 with demo fallback when no audio file is provided in form data', async () => {
      const req = new NextRequest('http://localhost:3000/api/voice', {
        method: 'POST',
      })
      req.headers.set('authorization', 'Bearer valid-token')
      
      // Mock formData method — no audio, no transcript
      req.formData = async () => {
        const fd = new FormData()
        return fd
      }

      const res = await voicePOST(req)
      // Route gracefully falls back to a demo transcript instead of returning 400
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.transcript).toBeDefined()
      expect(data.activities).toBeDefined()
    })

    it('returns 200 with transcript and activities parsed on success', async () => {
      const req = new NextRequest('http://localhost:3000/api/voice', {
        method: 'POST',
      })
      req.headers.set('authorization', 'Bearer valid-token')
      
      // Mock formData method with both audio and transcript
      req.formData = async () => {
        const fd = new FormData()
        fd.set('audio', new Blob(['audio-data'], { type: 'audio/wav' }), 'audio.wav')
        fd.set('transcript', 'I drove 15 kilometers today and had vegbiryani')
        return fd
      }

      const res = await voicePOST(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.processingStatus).toBe('complete')
      expect(data.transcript).toContain('I drove 15 kilometers')
      expect(data.activities.length).toBeGreaterThan(0)
    })
  })
})
