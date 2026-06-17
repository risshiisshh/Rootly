import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auth } from '@/services/firebase'
import { useAuthStore } from '@/store/userStore'
import { useActivityStore } from '@/store/activityStore'
import type { Activity, CreateActivityInput } from '@/types/activity'
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

export function useActivities(limit = 30) {
  const { userProfile } = useAuthStore()
  const { setActivities } = useActivityStore()
  const uid = userProfile?.uid

  return useQuery({
    queryKey: ['activities', uid, limit],
    queryFn: async (): Promise<Activity[]> => {
      if (!uid) return []
      const token = await getAuthToken()
      const res = await fetch(`/api/activity?limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) throw new Error('Failed to fetch activities')
      const data = await res.json()
      setActivities(data.activities)
      return data.activities
    },
    enabled: !!uid,
    staleTime: 60 * 1000,
  })
}

export function useWeeklyActivities() {
  const { userProfile } = useAuthStore()
  const uid = userProfile?.uid

  return useQuery({
    queryKey: ['activities', uid, 'weekly'],
    queryFn: async (): Promise<Activity[]> => {
      if (!uid) return []
      const token = await getAuthToken()
      const res = await fetch('/api/activity?weekly=true', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) throw new Error('Failed to fetch weekly activities')
      const data = await res.json()
      return data.activities
    },
    enabled: !!uid,
    staleTime: 60 * 1000,
  })
}

export function useCreateActivity() {
  const { userProfile } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateActivityInput): Promise<string> => {
      if (!userProfile?.uid) throw new Error('Not authenticated')
      const token = await getAuthToken()
      const res = await fetch('/api/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to create activity')
      }
      const data = await res.json()
      return data.activity.id
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['activities', userProfile?.uid] })
      analyticsTracker.track('ACTIVITY_LOGGED', {
        category: variables.category,
        activity: variables.activity,
        emission: variables.emission,
      })
    },
  })
}

export function useDeleteActivity() {
  const { userProfile } = useAuthStore()
  const { removeActivity } = useActivityStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const token = await getAuthToken()
      const res = await fetch(`/api/activity/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) throw new Error('Failed to delete activity')
    },
    onSuccess: (_, id) => {
      removeActivity(id)
      queryClient.invalidateQueries({ queryKey: ['activities', userProfile?.uid] })
    },
  })
}

