import { adminDb, isFirebaseAdminConfigured } from '../../lib/firebaseAdmin'
import type { Activity, CreateActivityInput } from '@/types/activity'
import { Timestamp } from 'firebase-admin/firestore'

// In-memory mock DB for demo mode (shared across backend instances)
const mockActivities: Activity[] = [
  {
    id: 'mock-act-1',
    userId: 'demo-user-id',
    category: 'transport',
    activity: 'train',
    quantity: 15,
    emission: 1.2,
    description: '15 km eco transit ride',
    timestamp: Timestamp.now() as any,
  },
  {
    id: 'mock-act-2',
    userId: 'demo-user-id',
    category: 'food',
    activity: 'vegan_meal',
    quantity: 1,
    emission: 0.8,
    description: 'Plant-based meal',
    timestamp: Timestamp.now() as any,
  },
  {
    id: 'mock-act-3',
    userId: 'demo-user-id',
    category: 'energy',
    activity: 'natural_gas_m3',
    quantity: 2.2,
    emission: 4.5,
    description: 'Standard home heating cycle',
    timestamp: Timestamp.now() as any,
  }
]

export class ActivityRepository {
  async create(userId: string, data: CreateActivityInput): Promise<Activity> {
    if (!isFirebaseAdminConfigured) {
      const activity: Activity = {
        id: `mock-act-${Date.now()}`,
        userId,
        ...data,
        timestamp: Timestamp.now() as any,
      }
      mockActivities.unshift(activity)
      return activity
    }

    const docRef = adminDb.collection('activities').doc()
    const activity: Activity = {
      id: docRef.id,
      userId,
      ...data,
      timestamp: Timestamp.now() as any,
    }

    await docRef.set(activity)
    return activity
  }

  async findById(id: string): Promise<Activity | null> {
    if (!isFirebaseAdminConfigured) {
      return mockActivities.find(a => a.id === id) || null
    }

    const doc = await adminDb.collection('activities').doc(id).get()
    if (!doc.exists) return null
    return doc.data() as Activity
  }

  async findByUserId(userId: string, options?: { limit?: number; category?: string }): Promise<Activity[]> {
    if (!isFirebaseAdminConfigured) {
      let filtered = mockActivities.filter(a => a.userId === userId)
      if (options?.category) {
        filtered = filtered.filter(a => a.category === options.category)
      }
      if (options?.limit) {
        filtered = filtered.slice(0, options.limit)
      }
      return filtered
    }

    let query = adminDb.collection('activities')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')

    if (options?.category) {
      query = query.where('category', '==', options.category)
    }
    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const snap = await query.get()
    return snap.docs.map((d: any) => d.data() as Activity)
  }

  async findWeekly(userId: string, date = new Date()): Promise<Activity[]> {
    const startOfWeek = new Date(date)
    startOfWeek.setHours(0, 0, 0, 0)
    // Find monday
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    if (!isFirebaseAdminConfigured) {
      return mockActivities.filter(a => {
        const t = (a.timestamp as any).toDate()
        return a.userId === userId && t >= startOfWeek && t <= endOfWeek
      })
    }

    const snap = await adminDb.collection('activities')
      .where('userId', '==', userId)
      .where('timestamp', '>=', Timestamp.fromDate(startOfWeek))
      .where('timestamp', '<=', Timestamp.fromDate(endOfWeek))
      .orderBy('timestamp', 'desc')
      .get()

    return snap.docs.map((d: any) => d.data() as Activity)
  }

  async update(id: string, data: Partial<Activity>): Promise<Activity> {
    if (!isFirebaseAdminConfigured) {
      const idx = mockActivities.findIndex(a => a.id === id)
      if (idx === -1) throw new Error('Activity not found')
      mockActivities[idx] = { ...mockActivities[idx], ...data }
      return mockActivities[idx]
    }

    const docRef = adminDb.collection('activities').doc(id)
    await docRef.update({ ...data })
    const updated = await docRef.get()
    return updated.data() as Activity
  }

  async delete(id: string): Promise<void> {
    if (!isFirebaseAdminConfigured) {
      const idx = mockActivities.findIndex(a => a.id === id)
      if (idx !== -1) mockActivities.splice(idx, 1)
      return
    }

    await adminDb.collection('activities').doc(id).delete()
  }
}

export const activityRepository = new ActivityRepository()
export { mockActivities }
