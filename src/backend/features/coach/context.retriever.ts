import { cacheService } from '../../lib/cache'
import { userRepository } from '../profile/user.repository'
import { activityRepository } from '../activity/activity.repository'
import { goalsRepository } from '../goals/goals.repository'
import { chatRepository } from '../chat/chat.repository'
import { recommendationsRepository } from './recommendations.repository'
import type { CoachContext } from './response.schema'
import { Timestamp } from 'firebase-admin/firestore'
import type { User } from '@/types/user'

const CONTEXT_CACHE_TTL = 10 * 1000 // 10 seconds context cache

export class ContextRetriever {
  async retrieve(userId: string, conversationId: string): Promise<CoachContext> {
    const cacheKey = `coach-context:${userId}:${conversationId}`
    const cached = cacheService.get<CoachContext>(cacheKey)
    if (cached) {
      return cached
    }

    const [user, recentActivities, weeklyActivities, activeGoals, history, previousRecommendations] = await Promise.all([
      userRepository.findById(userId),
      activityRepository.findByUserId(userId, { limit: 10 }),
      activityRepository.findWeekly(userId),
      goalsRepository.findByUserId(userId),
      chatRepository.getChatMessages(conversationId, 10),
      recommendationsRepository.findByUserId(userId, 5),
    ])

    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const weeklyEmissionsKg = weeklyActivities
      .filter((a) => {
        const d = (a.timestamp as any)?.toDate?.()
        return d && d >= oneWeekAgo
      })
      .reduce((s, a) => s + a.emission, 0)

    const previousWeekEmissionsKg = recentActivities
      .filter((a) => {
        const d = (a.timestamp as any)?.toDate?.()
        return d && d >= twoWeeksAgo && d < oneWeekAgo
      })
      .reduce((s, a) => s + a.emission, 0)

    const trend: 'improving' | 'stable' | 'worsening' =
      previousWeekEmissionsKg === 0 ? 'stable'
        : weeklyEmissionsKg < previousWeekEmissionsKg * 0.95 ? 'improving'
        : weeklyEmissionsKg > previousWeekEmissionsKg * 1.05 ? 'worsening'
        : 'stable'

    const userProfile: User = user ?? {
      uid: userId,
      displayName: 'Eco Explorer',
      email: 'demo@rootly.green',
      photoURL: null,
      carbonScore: 75,
      totalEmissionsKg: 0,
      weeklyGoalKg: 100,
      createdAt: Timestamp.now() as any,
      updatedAt: Timestamp.now() as any,
    }

    const context: CoachContext = {
      user: userProfile,
      recentActivities,
      weeklyActivities,
      activeGoals,
      weeklyEmissionsKg,
      previousWeekEmissionsKg,
      trend,
      carbonScore: userProfile.carbonScore,
      conversationHistory: history,
      previousRecommendations,
    }

    cacheService.set(cacheKey, context, CONTEXT_CACHE_TTL)
    return context
  }
}

export const contextRetriever = new ContextRetriever()
