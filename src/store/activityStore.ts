import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Activity } from '@/types/activity'

interface ActivityState {
  activities: Activity[]
  weeklyEmissionsKg: number
  isLoading: boolean
  error: string | null

  setActivities: (activities: Activity[]) => void
  addActivity: (activity: Activity) => void
  removeActivity: (id: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  computeWeeklyTotal: () => void
}

export const useActivityStore = create<ActivityState>()(
  devtools(
    (set, get) => ({
      activities: [],
      weeklyEmissionsKg: 0,
      isLoading: false,
      error: null,

      setActivities: (activities) => {
        set({ activities })
        get().computeWeeklyTotal()
      },
      addActivity: (activity) => {
        set((state) => ({ activities: [activity, ...state.activities] }))
        get().computeWeeklyTotal()
      },
      removeActivity: (id) => {
        set((state) => ({ activities: state.activities.filter((a) => a.id !== id) }))
        get().computeWeeklyTotal()
      },
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      computeWeeklyTotal: () => {
        const now = new Date()
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - 7)
        const weekly = get()
          .activities.filter((a) => {
            let date = new Date(0)
            if (a.timestamp) {
              if (typeof (a.timestamp as any).toDate === 'function') {
                date = (a.timestamp as any).toDate()
              } else if ((a.timestamp as any).seconds !== undefined) {
                date = new Date((a.timestamp as any).seconds * 1000)
              } else {
                date = new Date(a.timestamp as any)
              }
            }
            return date >= weekStart
          })
          .reduce((sum, a) => sum + a.emission, 0)
        set({ weeklyEmissionsKg: weekly })
      },
    }),
    { name: 'activity-store' }
  )
)
