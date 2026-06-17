import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { User as FirebaseUser } from 'firebase/auth'
import type { User } from '@/types/user'

interface AuthState {
  firebaseUser: FirebaseUser | null
  userProfile: User | null
  isLoading: boolean
  isAuthenticated: boolean

  setFirebaseUser: (user: FirebaseUser | null) => void
  setUserProfile: (profile: User | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      firebaseUser: null,
      userProfile: null,
      isLoading: true,
      isAuthenticated: false,

      setFirebaseUser: (user) =>
        set({ firebaseUser: user, isAuthenticated: !!user }),
      setUserProfile: (profile) => set({ userProfile: profile }),
      setLoading: (isLoading) => set({ isLoading }),
      reset: () =>
        set({
          firebaseUser: null,
          userProfile: null,
          isLoading: false,
          isAuthenticated: false,
        }),
    }),
    { name: 'auth-store' }
  )
)
