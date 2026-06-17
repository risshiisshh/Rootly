import { generateWeeklyReport } from '../../../services/claude'
import { reportsRepository } from './reports.repository'
import { activityRepository } from '../activity/activity.repository'
import { goalsRepository } from '../goals/goals.repository'
import { userRepository } from '../profile/user.repository'
import { getWeekStart, getWeekEnd } from '../../../lib/utils'
import type { WeeklyReport } from '@/types/report'
import type { User } from '@/types/user'
import { Timestamp } from 'firebase-admin/firestore'

export class ReportsService {
  async getLatestReport(userId: string): Promise<WeeklyReport | null> {
    return await reportsRepository.findLatest(userId)
  }

  async generateReport(userId: string, customApiKey?: string): Promise<WeeklyReport> {
    const now = new Date()

    // 1. Return cached report if generated within the last 15 minutes
    const latest = await reportsRepository.findLatest(userId)
    if (latest) {
      const generatedAt = (latest.generatedAt as any)?.toDate 
        ? (latest.generatedAt as any).toDate() 
        : new Date(latest.generatedAt as any)
      if (generatedAt && (now.getTime() - generatedAt.getTime()) < 15 * 60 * 1000) {
        return latest
      }
    }

    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const [user, currentWeekActivities, allActivities, activeGoals] = await Promise.all([
      userRepository.findById(userId),
      activityRepository.findWeekly(userId, now),
      activityRepository.findByUserId(userId, { limit: 50 }),
      goalsRepository.findByUserId(userId),
    ])

    const previousWeekActivities = allActivities.filter((a) => {
      const d = (a.timestamp as any)?.toDate?.()
      return d && d >= twoWeeksAgo && d < oneWeekAgo
    })

    const fallbackUser: User = user ?? {
      uid: userId,
      displayName: null,
      email: null,
      photoURL: null,
      carbonScore: 75,
      totalEmissionsKg: 0,
      weeklyGoalKg: 100,
      createdAt: Timestamp.now() as any,
      updatedAt: Timestamp.now() as any,
    }

    const result = await generateWeeklyReport({
      user: fallbackUser,
      activities: currentWeekActivities,
      previousWeekActivities,
      activeGoals,
    }, customApiKey)

    const totalEmissionsKg = currentWeekActivities.reduce((s, a) => s + a.emission, 0)

    // Build top contributors
    const categoryTotals: Record<string, number> = {}
    for (const a of currentWeekActivities) {
      categoryTotals[a.category] = (categoryTotals[a.category] ?? 0) + a.emission
    }
    const topContributors = Object.entries(categoryTotals)
      .map(([category, kg]) => ({
        category,
        kg,
        percentage: totalEmissionsKg > 0 ? Math.round((kg / totalEmissionsKg) * 100) : 0,
      }))
      .sort((a, b) => b.kg - a.kg)
      .slice(0, 4)

    // Calculate carbon score
    const weeklyGoal = fallbackUser.weeklyGoalKg ?? 100
    const rawScore = Math.max(0, Math.min(100, Math.round(100 - ((totalEmissionsKg / weeklyGoal) * 30))))
    const prevScore = fallbackUser.carbonScore ?? Math.max(0, rawScore - 5)

    const reportData = {
      userId,
      weekStart: Timestamp.fromDate(getWeekStart(now)) as any,
      weekEnd: Timestamp.fromDate(getWeekEnd(now)) as any,
      totalEmissionsKg,
      carbonScore: rawScore,
      previousScore: prevScore,
      scoreDelta: rawScore - prevScore,
      projectedAnnualKg: totalEmissionsKg * 52,
      topContributors: topContributors.map(({ category, kg, percentage }) => ({
        category,
        emissionsKg: kg,
        percentage,
      })),
      narrative: result.narrative,
      recommendations: result.recommendations,
      trend: result.trend,
    }

    // Save report
    const reportId = await reportsRepository.save(userId, reportData)

    return {
      id: reportId,
      ...reportData,
      generatedAt: Timestamp.now() as any,
    }
  }
}

export const reportsService = new ReportsService()
