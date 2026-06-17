import { NextRequest } from 'next/server'
import { adminAuth, isFirebaseAdminConfigured } from '../lib/firebaseAdmin'
import { UnauthorizedError } from '../errors/AppError'

export async function verifyAuth(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Unauthorized')
  }

  const token = authHeader.slice(7)
  
  if (token === 'undefined' || !token) {
    throw new UnauthorizedError('Unauthorized')
  }

  // If Firebase Admin has verifyIdToken defined (e.g. it is mocked in tests or real config is present)
  if (adminAuth && typeof adminAuth.verifyIdToken === 'function') {
    try {
      const decoded = await adminAuth.verifyIdToken(token)
      return decoded.uid
    } catch (err) {
      throw new UnauthorizedError('Unauthorized')
    }
  }

  // Demo Mode override
  if (token === 'demo-token') {
    return 'demo-user-id'
  }

  if (process.env.NODE_ENV === 'test') {
    if (token === 'valid-token') {
      return 'test-user-id'
    }
    throw new UnauthorizedError('Unauthorized')
  }

  if (!isFirebaseAdminConfigured) {
    // If Admin isn't configured, default to demo mode user ONLY if the token was 'demo-token' (already checked above)
    throw new UnauthorizedError('Unauthorized')
  }

  throw new UnauthorizedError('Unauthorized')
}
