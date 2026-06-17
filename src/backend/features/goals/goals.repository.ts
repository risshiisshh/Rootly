import { adminDb, isFirebaseAdminConfigured } from '../../lib/firebaseAdmin'
import type { Goal } from '@/types/report'
import { Timestamp } from 'firebase-admin/firestore'

const mockGoals: Goal[] = [
  {
    id: 'mock-goal-1',
    userId: 'demo-user-id',
    title: 'Reduce Transportation Emissions',
    description: 'Switch commute to electric train or cycling.',
    category: 'transportation' as any,
    targetReductionKg: 20,
    currentProgressKg: 5.5,
    deadline: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) as any,
    status: 'active',
    createdAt: Timestamp.now() as any,
    updatedAt: Timestamp.now() as any,
  },
  {
    id: 'mock-goal-2',
    userId: 'demo-user-id',
    title: 'Plant-based Diet Days',
    description: 'Have at least 4 vegetarian/vegan days a week.',
    category: 'diet' as any,
    targetReductionKg: 15,
    currentProgressKg: 12,
    deadline: Timestamp.fromDate(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)) as any,
    status: 'active',
    createdAt: Timestamp.now() as any,
    updatedAt: Timestamp.now() as any,
  }
]

export class GoalsRepository {
  async create(userId: string, data: Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'currentProgressKg' | 'status'>): Promise<Goal> {
    if (!isFirebaseAdminConfigured) {
      const goal: Goal = {
        id: `mock-goal-${Date.now()}`,
        userId,
        ...data,
        currentProgressKg: 0,
        status: 'active',
        createdAt: Timestamp.now() as any,
        updatedAt: Timestamp.now() as any,
      }
      mockGoals.unshift(goal)
      return goal
    }

    const docRef = adminDb.collection('goals').doc()
    const goal: Goal = {
      id: docRef.id,
      userId,
      ...data,
      currentProgressKg: 0,
      status: 'active',
      createdAt: Timestamp.now() as any,
      updatedAt: Timestamp.now() as any,
    }

    await docRef.set(goal)
    return goal
  }

  async findById(id: string): Promise<Goal | null> {
    if (!isFirebaseAdminConfigured) {
      return mockGoals.find(g => g.id === id) || null
    }

    const doc = await adminDb.collection('goals').doc(id).get()
    if (!doc.exists) return null
    return doc.data() as Goal
  }

  async findByUserId(userId: string): Promise<Goal[]> {
    if (!isFirebaseAdminConfigured) {
      return mockGoals.filter(g => g.userId === userId)
    }

    const snap = await adminDb.collection('goals')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get()

    return snap.docs.map((d: any) => d.data() as Goal)
  }

  async update(id: string, data: Partial<Goal>): Promise<Goal> {
    if (!isFirebaseAdminConfigured) {
      const idx = mockGoals.findIndex(g => g.id === id)
      if (idx === -1) throw new Error('Goal not found')
      mockGoals[idx] = { ...mockGoals[idx], ...data, updatedAt: Timestamp.now() as any }
      return mockGoals[idx]
    }

    const docRef = adminDb.collection('goals').doc(id)
    await docRef.update({ ...data, updatedAt: Timestamp.now() })
    const updated = await docRef.get()
    return updated.data() as Goal
  }

  async delete(id: string): Promise<void> {
    if (!isFirebaseAdminConfigured) {
      const idx = mockGoals.findIndex(g => g.id === id)
      if (idx !== -1) mockGoals.splice(idx, 1)
      return
    }

    await adminDb.collection('goals').doc(id).delete()
  }
}

export const goalsRepository = new GoalsRepository()
export { mockGoals }
