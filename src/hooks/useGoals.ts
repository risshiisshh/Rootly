import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auth } from '@/services/firebase'
import { useAuthStore } from '@/store/userStore'
import type { Goal } from '@/types/report'
import { analyticsTracker } from '@/lib/analytics'

async function getAuthToken(): Promise<string> {
  if (auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken()
    } catch {
      return 'demo-token'
    }
  }
  return 'demo-token'
}

export function useGoals() {
  const { userProfile } = useAuthStore()
  const uid = userProfile?.uid

  return useQuery({
    queryKey: ['goals', uid],
    queryFn: async (): Promise<Goal[]> => {
      if (!uid) return []
      const token = await getAuthToken()
      const res = await fetch('/api/goals', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) throw new Error('Failed to fetch goals')
      const data = await res.json()
      return data.goals
    },
    enabled: !!uid,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateGoal() {
  const { userProfile } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'currentProgressKg' | 'status'>): Promise<string> => {
      if (!userProfile?.uid) throw new Error('Not authenticated')
      const token = await getAuthToken()
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to create goal')
      }
      const resData = await res.json()
      return resData.goal.id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', userProfile?.uid] })
    },
  })
}

export function useUpdateGoal() {
  const { userProfile } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Goal> }): Promise<Goal> => {
      const token = await getAuthToken()
      const res = await fetch(`/api/goals/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update goal')
      const resData = await res.json()
      return resData.goal
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goals', userProfile?.uid] })
      if (variables.data.status === 'completed') {
        analyticsTracker.track('GOAL_COMPLETION', {
          goalId: variables.id,
          category: data.category,
          targetReductionKg: data.targetReductionKg,
        })
      }
    },
  })
}

export function useDeleteGoal() {
  const { userProfile } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const token = await getAuthToken()
      const res = await fetch(`/api/goals/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) throw new Error('Failed to delete goal')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', userProfile?.uid] })
    },
  })
}

