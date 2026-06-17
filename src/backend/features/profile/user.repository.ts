import { adminDb, isFirebaseAdminConfigured } from '../../lib/firebaseAdmin'
import type { User } from '@/types/user'
import { Timestamp } from 'firebase-admin/firestore'

export class UserRepository {
  async findById(uid: string): Promise<User | null> {
    if (!isFirebaseAdminConfigured) {
      return {
        uid,
        displayName: 'Eco Explorer',
        email: 'demo@rootly.green',
        photoURL: null,
        carbonScore: 82,
        totalEmissionsKg: 142.5,
        weeklyGoalKg: 100,
        createdAt: Timestamp.now() as any,
        updatedAt: Timestamp.now() as any,
      }
    }
    const doc = await adminDb.collection('users').doc(uid).get()
    if (!doc.exists) return null
    return { uid: doc.id, ...doc.data() } as User
  }

  async create(uid: string, data: Omit<User, 'uid' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user: User = {
      uid,
      ...data,
      carbonScore: 75,
      totalEmissionsKg: 0,
      weeklyGoalKg: data.weeklyGoalKg ?? 100,
      createdAt: Timestamp.now() as any,
      updatedAt: Timestamp.now() as any,
    }

    if (!isFirebaseAdminConfigured) return user

    await adminDb.collection('users').doc(uid).set({
      ...data,
      carbonScore: 75,
      totalEmissionsKg: 0,
      weeklyGoalKg: data.weeklyGoalKg ?? 100,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    return user
  }

  async update(uid: string, data: Partial<User>): Promise<void> {
    if (!isFirebaseAdminConfigured) return
    await adminDb.collection('users').doc(uid).update({
      ...data,
      updatedAt: Timestamp.now(),
    })
  }
}

export const userRepository = new UserRepository()
