import { adminDb, isFirebaseAdminConfigured } from '../../lib/firebaseAdmin'
import type { VoiceLog } from '@/types/activity'
import { Timestamp } from 'firebase-admin/firestore'

const mockVoiceLogs: VoiceLog[] = []

export class VoiceRepository {
  async create(
    userId: string,
    data: Omit<VoiceLog, 'id' | 'userId' | 'createdAt'>
  ): Promise<string> {
    if (!isFirebaseAdminConfigured) {
      const id = `mock-voice-${Date.now()}`
      mockVoiceLogs.unshift({
        id,
        userId,
        ...data,
        createdAt: Timestamp.now() as any,
      })
      return id
    }

    const docRef = await adminDb.collection('voiceLogs').add({
      ...data,
      userId,
      createdAt: Timestamp.now(),
    })
    return docRef.id
  }
}

export const voiceRepository = new VoiceRepository()
export { mockVoiceLogs }
