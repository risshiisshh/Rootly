import { adminDb, isFirebaseAdminConfigured } from '../../lib/firebaseAdmin'
import type { Recommendation, ExplainableRecommendation } from '@/types/recommendation'
import { toExplainableRecommendation } from '@/types/recommendation'
import { Timestamp } from 'firebase-admin/firestore'

const mockRecommendations: Recommendation[] = []

export class RecommendationsRepository {
  async save(
    userId: string,
    data: Omit<Recommendation, 'id' | 'userId' | 'createdAt'>
  ): Promise<string> {
    const id = isFirebaseAdminConfigured ? adminDb.collection('recommendations').doc().id : `mock-rec-${Date.now()}`
    const recommendation: Recommendation = {
      id,
      userId,
      ...data,
      createdAt: Timestamp.now() as any,
    }

    if (!isFirebaseAdminConfigured) {
      mockRecommendations.unshift(recommendation)
      return id
    }

    await adminDb.collection('recommendations').doc(id).set(recommendation)
    return id
  }

  async findByUserId(userId: string, limitCount = 10): Promise<Recommendation[]> {
    if (!isFirebaseAdminConfigured) {
      return mockRecommendations.filter(r => r.userId === userId).slice(0, limitCount)
    }

    const snap = await adminDb.collection('recommendations')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limitCount)
      .get()

    return snap.docs.map((d: any) => d.data() as Recommendation)
  }

  /**
   * Returns recommendation history mapped to the public ExplainableRecommendation
   * contract — the XAI shape used by the /api/recommendations endpoint.
   */
  async findByUserIdWithXai(
    userId: string,
    limitCount = 10
  ): Promise<ExplainableRecommendation[]> {
    const recs = await this.findByUserId(userId, limitCount)
    return recs.map((r) =>
      toExplainableRecommendation(r, (r.createdAt as any)?.toDate?.().toISOString())
    )
  }
}

export const recommendationsRepository = new RecommendationsRepository()
export { mockRecommendations }

