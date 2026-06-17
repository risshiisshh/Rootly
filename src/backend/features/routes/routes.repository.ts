import { adminDb, isFirebaseAdminConfigured } from '../../lib/firebaseAdmin'
import type { RouteComparison } from '@/types/route'
import { Timestamp } from 'firebase-admin/firestore'

const mockRouteComparisons: RouteComparison[] = []

export class RoutesRepository {
  async save(
    userId: string,
    data: Omit<RouteComparison, 'id' | 'userId' | 'createdAt'>
  ): Promise<string> {
    if (!isFirebaseAdminConfigured) {
      const id = `mock-route-${Date.now()}`
      mockRouteComparisons.unshift({
        id,
        userId,
        ...data,
        createdAt: Timestamp.now() as any,
      })
      return id
    }

    const docRef = await adminDb.collection('routeComparisons').add({
      ...data,
      userId,
      createdAt: Timestamp.now(),
    })
    return docRef.id
  }

  async findByUserId(userId: string, limitCount = 10): Promise<RouteComparison[]> {
    if (!isFirebaseAdminConfigured) {
      return mockRouteComparisons.filter(r => r.userId === userId).slice(0, limitCount)
    }

    const snap = await adminDb.collection('routeComparisons')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limitCount)
      .get()

    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as RouteComparison))
  }
}

export const routesRepository = new RoutesRepository()
export { mockRouteComparisons }
