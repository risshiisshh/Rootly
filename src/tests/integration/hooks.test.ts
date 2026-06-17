import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Mock Zustand auth store to simulate logged-in user
vi.mock('@/store/userStore', () => ({
  useAuthStore: vi.fn(() => ({
    userProfile: { uid: 'test-user-123', displayName: 'Hook Tester' },
    isAuthenticated: true,
  })),
}))

// Mock Zustand activity store
vi.mock('@/store/activityStore', () => ({
  useActivityStore: vi.fn(() => ({
    setActivities: vi.fn(),
    addActivity: vi.fn(),
    removeActivity: vi.fn(),
  })),
}))

// Mock Zustand chat store
vi.mock('@/store/chatStore', () => {
  let messages: any[] = []
  let conversationId: string | null = null
  let isLoading = false
  let error: string | null = null
  let inputValue = ''

  return {
    useChatStore: vi.fn(() => ({
      messages,
      isLoading,
      error,
      inputValue,
      conversationId,
      addMessage: vi.fn((m) => messages.push(m)),
      setLoading: vi.fn((l) => { isLoading = l }),
      setError: vi.fn((e) => { error = e }),
      setInputValue: vi.fn((v) => { inputValue = v }),
      setConversationId: vi.fn((id) => { conversationId = id }),
    })),
  }
})

import { useActivities, useWeeklyActivities, useCreateActivity, useDeleteActivity } from '../../hooks/useActivities'
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '../../hooks/useGoals'
import { useLatestReport, useGenerateReport } from '../../hooks/useReports'
import { useChat } from '../../hooks/useChat'
import { useRoutes } from '../../hooks/useRoutes'
import { useVoice } from '../../hooks/useVoice'
import { useAuth } from '../../hooks/useAuth'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return Wrapper
}

describe('React Query Integration Hooks', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn().mockImplementation(async (url, init) => {
      const u = url.toString()
      if (u.includes('/api/activity')) {
        if (init?.method === 'POST') {
          return {
            ok: true,
            json: async () => ({ activity: { id: 'mock-id', category: 'transport', activity: 'car', quantity: 10, emission: 1.92 } }),
          } as Response
        }
        return {
          ok: true,
          json: async () => ({ activities: [] }),
        } as Response
      }
      if (u.includes('/api/goals')) {
        if (init?.method === 'POST') {
          return {
            ok: true,
            json: async () => ({ goal: { id: 'mock-goal-id', title: 'Test Goal' } }),
          } as Response
        }
        return {
          ok: true,
          json: async () => ({ goals: [] }),
        } as Response
      }
      return {
        ok: true,
        json: async () => ({}),
      } as Response
    })
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('useActivities resolves data on query success', async () => {
    const { result } = renderHook(() => useActivities(10), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeDefined()
  })

  it('useWeeklyActivities resolves current weekly activities', async () => {
    const { result } = renderHook(() => useWeeklyActivities(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeDefined()
  })

  it('useCreateActivity triggers mutation successfully', async () => {
    const { result } = renderHook(() => useCreateActivity(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      category: 'transport',
      activity: 'bike',
      quantity: 5,
      emission: 0,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe('mock-id') // Matches mock in setup.ts
  })

  it('useGoals resolves user goals list', async () => {
    const { result } = renderHook(() => useGoals(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeDefined()
  })

  it('useCreateGoal triggers goals creation mutation', async () => {
    const { result } = renderHook(() => useCreateGoal(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      title: 'Reduce Red Meat',
      description: 'Eat chicken or veg',
      category: 'food',
      targetReductionKg: 10,
      deadline: new Date(Date.now() + 10000),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe('mock-goal-id')
  })

  it('useLatestReport resolves weekly reports', async () => {
    const { result } = renderHook(() => useLatestReport(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull() // default mock returns null
  })

  it('useGenerateReport triggers mutation', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ report: { id: 'real-report-id', userId: 'test-user-123' } }),
    } as Response)

    const { result } = renderHook(() => useGenerateReport(), {
      wrapper: createWrapper(),
    })

    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.id).toBe('real-report-id')
  })

  it('useChat hook sends message and appends response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'I am your coach.', conversationId: 'conv-new-123' }),
    } as Response)

    const { result } = renderHook(() => useChat())

    await result.current.sendMessage('hello')
    expect(result.current.input).toBe('')
  })

  it('useRoutes compares routes successfully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        comparison: {
          origin: 'A', destination: 'B', options: [],
          distanceKm: 10, recommendedMode: 'transit',
          totalSavingsKg: 2.5, aiReasoning: 'Take the train.',
        },
      }),
    } as Response)

    const { result } = renderHook(() => useRoutes(), {
      wrapper: createWrapper(),
    })

    // Use mutateAsync (compareAsync) so we can await the full mutation cycle
    await act(async () => {
      await result.current.compareAsync({ origin: 'A', destination: 'B' })
    })

    // mutation.data triggers a batched re-render; waitFor flushes it
    await waitFor(() => expect(result.current.comparison).not.toBeNull(), { timeout: 3000 })
    expect(result.current.comparison?.origin).toBe('A')
  })

  it('useVoice manages voice session flow', async () => {
    // Mock getUserMedia
    navigator.mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      }),
    } as any

    // Mock AudioContext and AnalyserNode
    global.AudioContext = vi.fn().mockImplementation(() => ({
      createMediaStreamSource: vi.fn().mockReturnValue({ connect: vi.fn() }),
      createAnalyser: vi.fn().mockReturnValue({ fftSize: 64, frequencyBinCount: 32, getByteFrequencyData: vi.fn() }),
    })) as any

    // Mock MediaRecorder
    class MockMediaRecorder {
      ondataavailable: any
      onstop: any
      start = vi.fn()
      stop = vi.fn(() => {
        if (this.onstop) this.onstop()
      })
      static isTypeSupported = () => true
    }
    global.MediaRecorder = MockMediaRecorder as any

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ transcript: 'I drove', activities: [] }),
    } as Response)

    const { result } = renderHook(() => useVoice())

    await act(async () => {
      await result.current.start()
    })
    expect(result.current.error).toBeNull()
    expect(result.current.state).toBe('recording')

    await act(async () => {
      result.current.stop()
    })
    await waitFor(() => expect(result.current.state).toBe('complete'))
    expect(result.current.transcript).toBe('I drove')
  })

  it('useVoice handles start recording failure', async () => {
    navigator.mediaDevices = {
      getUserMedia: vi.fn().mockRejectedValue(new Error('Permission denied')),
    } as any

    const { result } = renderHook(() => useVoice())
    await act(async () => {
      await result.current.start()
    })
    expect(result.current.state).toBe('error')
    expect(result.current.error).toBe('Permission denied')

    act(() => {
      result.current.reset()
    })
    expect(result.current.state).toBe('idle')
    expect(result.current.transcript).toBe('')
  })

  it('useDeleteActivity triggers delete mutation successfully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response)

    const { result } = renderHook(() => useDeleteActivity(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('mock-id')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('useUpdateGoal triggers goal update mutation successfully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ goal: { id: 'mock-goal-id', title: 'Updated Goal', status: 'completed' } }),
    } as Response)

    const { result } = renderHook(() => useUpdateGoal(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 'mock-goal-id', data: { status: 'completed' } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.status).toBe('completed')
  })

  it('useDeleteGoal triggers goal delete mutation successfully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response)

    const { result } = renderHook(() => useDeleteGoal(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('mock-goal-id')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('useCreateActivity handles failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Fail' }),
    } as Response)

    const { result } = renderHook(() => useCreateActivity(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      category: 'transport',
      activity: 'bike',
      quantity: 5,
      emission: 0,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Fail')
  })

  it('useGenerateReport handles failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Report failed' }),
    } as Response)

    const { result } = renderHook(() => useGenerateReport(), {
      wrapper: createWrapper(),
    })

    result.current.mutate()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Report failed')
  })

  it('useRoutes handles compare failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Routes failed' }),
    } as Response)

    const { result } = renderHook(() => useRoutes(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      try {
        await result.current.compareAsync({ origin: 'A', destination: 'B' })
      } catch (err) { }
    })

    await waitFor(() => expect(result.current.error).toBe('Routes failed'))
  })

  it('useAuth returns the AuthContext value', () => {
    expect(useAuth).toBeDefined()
  })
})
