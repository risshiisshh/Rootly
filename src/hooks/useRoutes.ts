import { useMutation } from '@tanstack/react-query'
import { auth, isFirebaseConfigured } from '@/services/firebase'
import type { RouteOption } from '@/types/route'
import { analyticsTracker } from '@/lib/analytics'

interface RouteComparison {
  origin: string
  destination: string
  distanceKm: number
  options: RouteOption[]
  recommendedMode: string
  totalSavingsKg: number
  aiReasoning: string
}

export function useRoutes() {
  const mutation = useMutation({
    mutationFn: async ({ origin, destination }: { origin: string; destination: string }) => {
      let token = 'demo-token'
      if (isFirebaseConfigured && auth.currentUser) {
        try { token = await auth.currentUser.getIdToken() } catch { token = 'demo-token' }
      }
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ origin, destination }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Route comparison failed')
      }
      const data = await res.json()
      return data.comparison as RouteComparison
    },
    onSuccess: (data) => {
      analyticsTracker.track('ROUTE_COMPARISON', {
        recommendedMode: data.recommendedMode,
        optionsCount: data.options?.length || 0,
        savingsKg: data.totalSavingsKg || 0,
      })
    },
  })

  return {
    // Derive comparison directly from mutation.data so React Query's
    // state management keeps it in sync reliably (no dual-state problem)
    comparison: mutation.data ?? null,
    compare: mutation.mutate,
    compareAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
    reset: mutation.reset,
  }
}
