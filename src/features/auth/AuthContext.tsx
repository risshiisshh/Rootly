'use client'

import {
  createContext,
  useContext,
  useEffect,
  ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth'
import { auth } from '@/services/firebase'
import { createUser, getUser } from '@/services/firestore'
import { useAuthStore } from '@/store/userStore'
import { Timestamp } from 'firebase/firestore'
import { analyticsTracker } from '@/lib/analytics'

interface AuthContextValue {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOutUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

import { isFirebaseConfigured } from '@/services/firebase'

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setFirebaseUser, setUserProfile, setLoading, reset } = useAuthStore()

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(true)
      const isDemoLoggedIn = typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('rootly_demo_logged_in') === 'true'
      if (isDemoLoggedIn) {
        const mockUser = {
          uid: 'demo-user-id',
          displayName: 'Eco Explorer',
          email: 'demo@rootly.green',
          photoURL: null,
          emailVerified: true,
        } as FirebaseUser
        
        setFirebaseUser(mockUser)
        setUserProfile({
          uid: 'demo-user-id',
          displayName: 'Eco Explorer',
          email: 'demo@rootly.green',
          photoURL: null,
          carbonScore: 82,
          totalEmissionsKg: 142.5,
          weeklyGoalKg: 100,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        })
      } else {
        reset()
      }
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      setLoading(true)
      if (user) {
        setFirebaseUser(user)
        // Load user profile from Firestore
        try {
          const profile = await getUser(user.uid)
          if (profile) {
            setUserProfile(profile)
          } else {
            // Create profile for new users
            await createUser(user.uid, {
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
              carbonScore: 75,
              totalEmissionsKg: 0,
              weeklyGoalKg: 100,
            })
            const newProfile = await getUser(user.uid)
            setUserProfile(newProfile)
          }
        } catch (error) {
          console.error('Error loading user profile:', error)
        }
      } else {
        reset()
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [setFirebaseUser, setUserProfile, setLoading, reset])

  const signIn = async (email: string, password: string): Promise<void> => {
    if (!isFirebaseConfigured) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('rootly_demo_logged_in', 'true')
      }
      setFirebaseUser({ uid: 'demo-user-id', email, displayName: 'Eco Explorer' } as FirebaseUser)
      setUserProfile({
        uid: 'demo-user-id',
        displayName: 'Eco Explorer',
        email: email,
        photoURL: null,
        carbonScore: 82,
        totalEmissionsKg: 142.5,
        weeklyGoalKg: 100,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
      analyticsTracker.track('USER_LOGIN', { method: 'email' })
      return
    }
    await signInWithEmailAndPassword(auth, email, password)
    analyticsTracker.track('USER_LOGIN', { method: 'email' })
  }

  const signUp = async (email: string, password: string, displayName: string): Promise<void> => {
    if (!isFirebaseConfigured) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('rootly_demo_logged_in', 'true')
      }
      setFirebaseUser({ uid: 'demo-user-id', email, displayName } as FirebaseUser)
      setUserProfile({
        uid: 'demo-user-id',
        displayName,
        email,
        photoURL: null,
        carbonScore: 82,
        totalEmissionsKg: 142.5,
        weeklyGoalKg: 100,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
      analyticsTracker.track('USER_LOGIN', { method: 'email_signup' })
      return
    }
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName })
    analyticsTracker.track('USER_LOGIN', { method: 'email_signup' })
  }

  const signInWithGoogle = async (): Promise<void> => {
    if (!isFirebaseConfigured) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('rootly_demo_logged_in', 'true')
      }
      setFirebaseUser({ uid: 'demo-user-id', email: 'demo@rootly.green', displayName: 'Eco Explorer' } as FirebaseUser)
      setUserProfile({
        uid: 'demo-user-id',
        displayName: 'Eco Explorer',
        email: 'demo@rootly.green',
        photoURL: null,
        carbonScore: 82,
        totalEmissionsKg: 142.5,
        weeklyGoalKg: 100,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
      analyticsTracker.track('USER_LOGIN', { method: 'google' })
      return
    }
    const provider = new GoogleAuthProvider()
    provider.addScope('email')
    provider.addScope('profile')
    await signInWithPopup(auth, provider)
    analyticsTracker.track('USER_LOGIN', { method: 'google' })
  }

  const signOutUser = async (): Promise<void> => {
    if (!isFirebaseConfigured) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('rootly_demo_logged_in')
      }
      reset()
      return
    }
    await signOut(auth)
  }


  return (
    <AuthContext.Provider value={{ signIn, signUp, signInWithGoogle, signOutUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
