import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../../store/userStore'
import { useActivityStore } from '../../store/activityStore'
import { useChatStore } from '../../store/chatStore'
import { Timestamp } from 'firebase/firestore'
import type { Activity } from '@/types/activity'

describe('Zustand State Stores', () => {
  describe('useAuthStore', () => {
    beforeEach(() => {
      useAuthStore.getState().reset()
    })

    it('initializes with default values', () => {
      const state = useAuthStore.getState()
      expect(state.firebaseUser).toBeNull()
      expect(state.userProfile).toBeNull()
      expect(state.isLoading).toBe(false) // after reset
      expect(state.isAuthenticated).toBe(false)
    })

    it('sets firebaseUser and updates isAuthenticated', () => {
      const mockUser = { uid: 'u123', email: 'test@example.com' } as any
      useAuthStore.getState().setFirebaseUser(mockUser)

      const state = useAuthStore.getState()
      expect(state.firebaseUser).toBe(mockUser)
      expect(state.isAuthenticated).toBe(true)
    })

    it('sets userProfile correctly', () => {
      const mockProfile = { uid: 'u123', displayName: 'Eco Dude' } as any
      useAuthStore.getState().setUserProfile(mockProfile)

      const state = useAuthStore.getState()
      expect(state.userProfile).toBe(mockProfile)
    })
  })

  describe('useActivityStore', () => {
    beforeEach(() => {
      useActivityStore.setState({
        activities: [],
        weeklyEmissionsKg: 0,
        isLoading: false,
        error: null,
      })
    })

    it('adds and removes activities, updating weekly totals', () => {
      const act1: Activity = {
        id: 'a1',
        userId: 'u1',
        category: 'food',
        activity: 'vegan_burger',
        quantity: 1,
        emission: 0.5,
        timestamp: Timestamp.now(),
        createdAt: Timestamp.now(),
      }
      
      const act2: Activity = {
        id: 'a2',
        userId: 'u1',
        category: 'transport',
        activity: 'car',
        quantity: 50,
        emission: 10.0,
        timestamp: Timestamp.now(),
        createdAt: Timestamp.now(),
      }

      const store = useActivityStore.getState()
      store.addActivity(act1)
      expect(useActivityStore.getState().activities).toHaveLength(1)
      expect(useActivityStore.getState().weeklyEmissionsKg).toBe(0.5)

      useActivityStore.getState().addActivity(act2)
      expect(useActivityStore.getState().activities).toHaveLength(2)
      expect(useActivityStore.getState().weeklyEmissionsKg).toBe(10.5)

      useActivityStore.getState().removeActivity('a1')
      expect(useActivityStore.getState().activities).toHaveLength(1)
      expect(useActivityStore.getState().weeklyEmissionsKg).toBe(10.0)
    })

    it('does not count activities older than 7 days in weekly emissions total', () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 10)

      const oldAct: Activity = {
        id: 'old',
        userId: 'u1',
        category: 'transport',
        activity: 'flight',
        quantity: 400,
        emission: 100.0,
        timestamp: Timestamp.fromDate(oldDate),
        createdAt: Timestamp.fromDate(oldDate),
      }

      useActivityStore.getState().addActivity(oldAct)
      expect(useActivityStore.getState().weeklyEmissionsKg).toBe(0)
    })
  })

  describe('useChatStore', () => {
    beforeEach(() => {
      useChatStore.getState().reset()
    })

    it('manages messages and conversation ID', () => {
      useChatStore.getState().setConversationId('conv-123')
      expect(useChatStore.getState().conversationId).toBe('conv-123')

      const msg = { id: 'm1', role: 'user', content: 'hello coach' } as any
      useChatStore.getState().addMessage(msg)
      expect(useChatStore.getState().messages).toHaveLength(1)
      expect(useChatStore.getState().messages[0].content).toBe('hello coach')

      useChatStore.getState().reset()
      expect(useChatStore.getState().messages).toHaveLength(0)
      expect(useChatStore.getState().conversationId).toBeNull()
    })
  })
})
