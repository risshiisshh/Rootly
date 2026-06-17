import { Timestamp } from 'firebase/firestore'

export type ActivityCategory = 'transport' | 'food' | 'energy' | 'lifestyle' | 'other'
export type ActivitySource = 'manual' | 'voice' | 'ai'

export interface Activity {
  id: string
  userId: string
  category: ActivityCategory
  activity: string
  quantity: number
  emission: number
  timestamp: Timestamp
  description?: string
  createdAt?: Timestamp
  source?: ActivitySource
}

export interface CreateActivityInput {
  category: ActivityCategory
  activity: string
  quantity: number
  emission: number
  description?: string
  source?: ActivitySource
}

export interface VoiceLog {
  id: string
  userId: string
  transcript: string
  extractedActivities: Omit<Activity, 'id' | 'userId' | 'createdAt'>[]
  audioLengthSeconds: number
  processingStatus: 'pending' | 'complete' | 'failed'
  createdAt: Timestamp
  feedback?: string
}
