import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Polyfill scrollIntoView globally before imports
if (typeof globalThis !== 'undefined') {
  const mockScroll = () => {}
  const ctors = [
    (globalThis as any).Element,
    (globalThis as any).HTMLElement,
    (globalThis as any).HTMLDivElement,
    typeof window !== 'undefined' ? (window as any).Element : null,
    typeof window !== 'undefined' ? (window as any).HTMLElement : null,
    typeof window !== 'undefined' ? (window as any).HTMLDivElement : null,
  ]
  ctors.forEach((c) => {
    if (c && c.prototype) {
      c.prototype.scrollIntoView = mockScroll
    }
  })
}

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

// Mock window.matchMedia for responsive layouts
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock next/link to just render an anchor tag
vi.mock('next/link', () => {
  return {
    default: ({ children, href, ...props }: any) => {
      return React.createElement('a', { href, ...props }, children)
    }
  }
})

// Mock userStore
vi.mock('@/store/userStore', () => ({
  useAuthStore: () => ({
    userProfile: { uid: 'demo-user-id', displayName: 'Eco Explorer', carbonScore: 82, weeklyGoalKg: 100 },
    isAuthenticated: true,
    setFirebaseUser: vi.fn(),
    setUserProfile: vi.fn(),
    setLoading: vi.fn(),
    reset: vi.fn(),
  }),
}))

// Mock activityStore
vi.mock('@/store/activityStore', () => ({
  useActivityStore: () => ({
    activities: [
      { id: 'act-1', category: 'transport', activity: 'car', quantity: 15, emission: 2.88, timestamp: new Date() },
      { id: 'act-2', category: 'food', activity: 'veg_biryani', quantity: 1, emission: 0.5, timestamp: new Date() },
    ],
    weeklyEmissionsKg: 3.38,
    setActivities: vi.fn(),
    addActivity: vi.fn(),
    removeActivity: vi.fn(),
  }),
}))

// Import client features
import { DashboardClient } from '@/features/dashboard/DashboardClient'
import { ActivityClient } from '@/features/activity/ActivityClient'
import { CoachClient } from '@/features/chat/CoachClient'
import { ExportsClient } from '@/features/exports/ExportsClient'
import { GoalsClient } from '@/features/goals/GoalsClient'
import { InsightsClient } from '@/features/insights/InsightsClient'
import { ProfileClient } from '@/features/profile/ProfileClient'
import { ReportsClient } from '@/features/reports/ReportsClient'
import { RoutesClient } from '@/features/routes/RoutesClient'
import { VoiceClient } from '@/features/voice/VoiceClient'
import { AuthProvider } from '@/features/auth/AuthContext'

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

describe('Feature Components Integration & Render Tests', () => {
  const originalFetch = global.fetch
  let originalCreateElement: typeof document.createElement

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Intercept createElement to automatically mock scrollIntoView on every DOM node
    originalCreateElement = document.createElement
    document.createElement = function(tagName: string, options?: ElementCreationOptions) {
      const el = originalCreateElement.call(document, tagName, options)
      el.scrollIntoView = vi.fn()
      return el
    }
    
    // Mock global fetch for APIs
    global.fetch = vi.fn().mockImplementation(async (url, init) => {
      const u = url.toString()
      if (u.includes('/api/activity')) {
        return {
          ok: true,
          json: async () => ({ activities: [] }),
        } as Response
      }
      if (u.includes('/api/goals')) {
        return {
          ok: true,
          json: async () => ({ goals: [] }),
        } as Response
      }
      if (u.includes('/api/reports')) {
        return {
          ok: true,
          json: async () => ({ report: { id: 'report-123', userId: 'demo-user-id', narrative: 'Good job' } }),
        } as Response
      }
      if (u.includes('/api/routes')) {
        return {
          ok: true,
          json: async () => ({ comparison: { options: [], origin: 'A', destination: 'B' } }),
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
    if (originalCreateElement) {
      document.createElement = originalCreateElement
    }
  })

  it('renders DashboardClient successfully', async () => {
    render(React.createElement(DashboardClient), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getAllByText(/Intelligence/i).length).toBeGreaterThan(0)
    })
  })

  it('renders ActivityClient successfully', async () => {
    render(React.createElement(ActivityClient), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getAllByText(/Activity/i).length).toBeGreaterThan(0)
    })
  })

  it('renders CoachClient successfully', async () => {
    render(React.createElement(CoachClient), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getAllByLabelText(/Message to AI coach/i).length).toBeGreaterThan(0)
    })
  })

  it('renders ExportsClient successfully', async () => {
    render(React.createElement(ExportsClient), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getAllByText(/Export/i).length).toBeGreaterThan(0)
    })
  })

  it('renders GoalsClient successfully', async () => {
    render(React.createElement(GoalsClient), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getAllByText(/Goal/i).length).toBeGreaterThan(0)
    })
  })

  it('renders InsightsClient successfully', async () => {
    render(React.createElement(InsightsClient), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getAllByText(/Analytics/i).length).toBeGreaterThan(0)
    })
  })

  it('renders ProfileClient successfully', async () => {
    render(React.createElement(ProfileClient), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getAllByText(/Profile/i).length).toBeGreaterThan(0)
    })
  })

  it('renders ReportsClient successfully', async () => {
    render(React.createElement(ReportsClient), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getAllByText(/Briefing/i).length).toBeGreaterThan(0)
    })
  })

  it('renders RoutesClient successfully', async () => {
    render(React.createElement(RoutesClient), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getAllByText(/Route/i).length).toBeGreaterThan(0)
    })
  })

  it('renders VoiceClient successfully', async () => {
    // Mock mediaDevices in window to prevent crash
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({}),
      },
    })
    
    render(React.createElement(VoiceClient), { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getAllByText(/Voice/i).length).toBeGreaterThan(0)
    })
  })

  it('renders AuthProvider successfully and wraps children', () => {
    render(
      React.createElement(AuthProvider, {
        children: React.createElement('div', { 'data-testid': 'child' }, 'Child content')
      })
    )
    expect(screen.getByTestId('child')).toHaveTextContent('Child content')
  })
})
