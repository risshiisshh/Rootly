import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLatestWeeklyReport } from '@/services/firestore'
import { auth } from '@/services/firebase'
import { useAuthStore } from '@/store/userStore'
import type { WeeklyReport } from '@/types/report'
import { getSafeLocalStorage } from '@/lib/utils'
import { analyticsTracker } from '@/lib/analytics'

export function useLatestReport() {
  const { userProfile } = useAuthStore()
  const uid = userProfile?.uid

  return useQuery({
    queryKey: ['reports', uid, 'latest'],
    queryFn: () => uid ? getLatestWeeklyReport(uid) : null,
    enabled: !!uid,
    staleTime: 5 * 60 * 1000,
  })
}

export function useGenerateReport() {
  const { userProfile } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<WeeklyReport> => {
      if (!userProfile?.uid) throw new Error('Not authenticated')
      const token = await auth.currentUser?.getIdToken()
      const customKey = getSafeLocalStorage('user_gemini_api_key')
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(customKey ? { 'x-gemini-key': customKey } : {}),
        },
        body: JSON.stringify({ uid: userProfile.uid }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Report generation failed')
      }
      const data = await res.json()
      return data.report as WeeklyReport
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reports', userProfile?.uid] })
      analyticsTracker.track('REPORT_GENERATION', {
        reportId: data.id,
        carbonScore: data.carbonScore,
        totalEmissionsKg: data.totalEmissionsKg,
      })
    },
  })
}
