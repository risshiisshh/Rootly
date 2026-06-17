import { activityRepository } from './activity.repository'
import type { Activity, CreateActivityInput } from '@/types/activity'
import { NotFoundError, UnauthorizedError } from '../../errors/AppError'

export class ActivityService {
  async logActivity(userId: string, input: CreateActivityInput): Promise<Activity> {
    // Perform any business logic, calculations, or integrations here
    return await activityRepository.create(userId, input)
  }

  async getActivities(userId: string, limit?: number, category?: string): Promise<Activity[]> {
    return await activityRepository.findByUserId(userId, { limit, category })
  }

  async getWeeklyActivities(userId: string, date?: Date): Promise<Activity[]> {
    return await activityRepository.findWeekly(userId, date)
  }

  async updateActivity(userId: string, activityId: string, data: Partial<Activity>): Promise<Activity> {
    const activity = await activityRepository.findById(activityId)
    if (!activity) {
      throw new NotFoundError('Activity not found')
    }
    if (activity.userId !== userId) {
      throw new UnauthorizedError('Unauthorized access to this activity')
    }
    // Privilege escalation protection: Strip critical metadata fields
    const { id, userId: targetUserId, timestamp, ...sanitized } = data as any
    return await activityRepository.update(activityId, sanitized)
  }

  async deleteActivity(userId: string, activityId: string): Promise<void> {
    const activity = await activityRepository.findById(activityId)
    if (!activity) {
      throw new NotFoundError('Activity not found')
    }
    if (activity.userId !== userId) {
      throw new UnauthorizedError('Unauthorized access to this activity')
    }
    await activityRepository.delete(activityId)
  }
}

export const activityService = new ActivityService()
