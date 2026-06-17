import { goalsRepository } from './goals.repository'
import type { Goal } from '@/types/report'
import { NotFoundError, UnauthorizedError } from '../../errors/AppError'

export class GoalsService {
  async createGoal(userId: string, data: Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'currentProgressKg' | 'status'>): Promise<Goal> {
    return await goalsRepository.create(userId, data)
  }

  async getGoals(userId: string): Promise<Goal[]> {
    return await goalsRepository.findByUserId(userId)
  }

  async updateGoal(userId: string, goalId: string, data: Partial<Goal>): Promise<Goal> {
    const goal = await goalsRepository.findById(goalId)
    if (!goal) {
      throw new NotFoundError('Goal not found')
    }
    if (goal.userId !== userId) {
      throw new UnauthorizedError('Unauthorized access to this goal')
    }

    // Privilege escalation protection: Strip critical metadata fields
    const { id, userId: targetUserId, createdAt, ...sanitized } = data as any

    // Milestone/Completion detection
    const updatedData = { ...sanitized }
    if (sanitized.currentProgressKg !== undefined) {
      const target = sanitized.targetReductionKg ?? goal.targetReductionKg
      if (sanitized.currentProgressKg >= target) {
        updatedData.status = 'completed'
      } else {
        updatedData.status = 'active'
      }
    }

    return await goalsRepository.update(goalId, updatedData)
  }

  async deleteGoal(userId: string, goalId: string): Promise<void> {
    const goal = await goalsRepository.findById(goalId)
    if (!goal) {
      throw new NotFoundError('Goal not found')
    }
    if (goal.userId !== userId) {
      throw new UnauthorizedError('Unauthorized access to this goal')
    }
    await goalsRepository.delete(goalId)
  }
}

export const goalsService = new GoalsService()
