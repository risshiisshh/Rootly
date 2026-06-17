import { z } from 'zod'
import type { User } from '@/types/user'
import type { Activity } from '@/types/activity'
import type { Goal } from '@/types/report'
import type { ChatMessage } from '@/types/chat'
import type { Recommendation } from '@/types/recommendation'

export const coachResponseSchema = z.object({
  observation: z.string().min(1, 'Observation is required'),
  reasoning: z.string().min(1, 'Reasoning is required'),
  recommendation: z.string().min(1, 'Recommendation is required'),
  estimatedImpact: z.string().min(1, 'Estimated impact is required'),
})

export type CoachResponse = z.infer<typeof coachResponseSchema>

export interface CoachContext {
  user: User
  recentActivities: Activity[]
  weeklyActivities: Activity[]
  activeGoals: Goal[]
  weeklyEmissionsKg: number
  previousWeekEmissionsKg: number
  trend: 'improving' | 'stable' | 'worsening'
  carbonScore: number
  conversationHistory: ChatMessage[]
  previousRecommendations?: Recommendation[]
}
