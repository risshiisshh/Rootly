import { Timestamp } from 'firebase/firestore'

export interface User {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
  carbonScore: number
  totalEmissionsKg: number
  weeklyGoalKg: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface UserProfile extends User {
  streak: number
  rank: string
  rankPercentile: number
  totalActivities: number
}
