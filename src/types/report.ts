import { Timestamp } from 'firebase/firestore'

export interface WeeklyReport {
  id: string
  userId: string
  weekStart: Timestamp
  weekEnd: Timestamp
  totalEmissionsKg: number
  carbonScore: number
  previousScore: number
  scoreDelta: number
  topContributors: { category: string; percentage: number; emissionsKg: number }[]
  recommendations: Recommendation[]
  trend: 'improving' | 'stable' | 'worsening'
  narrative: string
  projectedAnnualKg: number
  daysUntilGoal?: number
  generatedAt: Timestamp
}

export interface Recommendation {
  id?: string
  title: string
  description: string
  potentialSavingsKg: number
  potentialSavingsPercentage?: number
  priority: 'high' | 'medium' | 'low'
  category?: string
  estimatedEffort?: 'easy' | 'medium' | 'hard'
  timeToImpact?: string
}

export interface Goal {
  id: string
  userId: string
  title: string
  description: string
  category: string
  targetReductionKg: number
  currentProgressKg: number
  deadline: Timestamp
  status: 'active' | 'completed' | 'paused'
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CreateGoalInput {
  title: string
  description: string
  category: string
  targetReductionKg: number
  deadline: Date
}
