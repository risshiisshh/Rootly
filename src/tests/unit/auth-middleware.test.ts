import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { verifyAuth } from '../../backend/middleware/auth'
import { adminAuth } from '../../backend/lib/firebaseAdmin'
import { UnauthorizedError } from '../../backend/errors/AppError'

// Mock Firebase Admin
vi.mock('../../backend/lib/firebaseAdmin', () => {
  return {
    isFirebaseAdminConfigured: true,
    adminAuth: {
      verifyIdToken: vi.fn(),
    },
  }
})

describe('verifyAuth Middleware Unit Tests', () => {
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.clearAllMocks()
    ;(process.env as any).NODE_ENV = 'development'
  })

  afterEach(() => {
    ;(process.env as any).NODE_ENV = originalEnv
  })

  it('allows demo-token in development mode', async () => {
    const req = new NextRequest('http://localhost:3000/api/activity', {
      headers: {
        authorization: 'Bearer demo-token',
      },
    })

    const uid = await verifyAuth(req)
    expect(uid).toBe('demo-user-id')
  })

  it('rejects demo-token in production mode with Firebase Admin configured', async () => {
    ;(process.env as any).NODE_ENV = 'production'
    const req = new NextRequest('http://localhost:3000/api/activity', {
      headers: {
        authorization: 'Bearer demo-token',
      },
    })

    await expect(verifyAuth(req)).rejects.toThrow(UnauthorizedError)
  })

  it('verifies a valid custom token using Firebase Admin', async () => {
    const mockVerify = vi.mocked(adminAuth.verifyIdToken)
    mockVerify.mockResolvedValueOnce({ uid: 'firebase-user-123' } as any)

    const req = new NextRequest('http://localhost:3000/api/activity', {
      headers: {
        authorization: 'Bearer custom-firebase-token',
      },
    })

    const uid = await verifyAuth(req)
    expect(uid).toBe('firebase-user-123')
    expect(mockVerify).toHaveBeenCalledWith('custom-firebase-token')
  })

  it('rejects an invalid authorization header format', async () => {
    const req = new NextRequest('http://localhost:3000/api/activity', {
      headers: {
        authorization: 'Basic credentials',
      },
    })

    await expect(verifyAuth(req)).rejects.toThrow(UnauthorizedError)
  })

  it('rejects a missing authorization header', async () => {
    const req = new NextRequest('http://localhost:3000/api/activity')

    await expect(verifyAuth(req)).rejects.toThrow(UnauthorizedError)
  })
})
