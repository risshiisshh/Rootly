import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

// Mock Zustand userStore
vi.mock('@/store/userStore', () => ({
  useAuthStore: () => ({
    userProfile: { uid: 'demo-user-id', displayName: 'Eco Explorer' },
    isAuthenticated: true,
  }),
}))

// Mock Zustand chatStore
vi.mock('@/store/chatStore', () => ({
  useChatStore: Object.assign(
    (selector: any) => {
      const state = {
        messages: [],
        conversationId: 'demo-conv-id',
        isLoading: false,
        latestExplanation: null,
        setMessages: vi.fn(),
        addMessage: vi.fn(),
        setConversationId: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
        setLatestExplanation: vi.fn(),
      }
      return selector ? selector(state) : state
    },
    {
      getState: () => ({
        messages: [],
        conversationId: 'demo-conv-id',
        isLoading: false,
        latestExplanation: null,
        setMessages: vi.fn(),
        addMessage: vi.fn(),
        setConversationId: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
        setLatestExplanation: vi.fn(),
      }),
      subscribe: vi.fn(),
    }
  ),
}))

// Mock AuthContext
vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    signOutUser: vi.fn(),
  }),
}))

// Mock Firestore Service to include chat-specific methods
vi.mock('@/services/firestore', () => ({
  getOrCreateConversation: vi.fn().mockResolvedValue('demo-conv-id'),
  getChatMessages: vi.fn().mockResolvedValue([]),
  saveChatMessage: vi.fn().mockResolvedValue(undefined),
  getUserActivities: vi.fn().mockResolvedValue([]),
  createActivity: vi.fn().mockResolvedValue('mock-id'),
  deleteActivity: vi.fn().mockResolvedValue(undefined),
  getWeeklyActivities: vi.fn().mockResolvedValue([]),
  getUserGoals: vi.fn().mockResolvedValue([]),
  createGoal: vi.fn().mockResolvedValue('mock-goal-id'),
  updateGoal: vi.fn().mockResolvedValue(undefined),
  deleteGoal: vi.fn().mockResolvedValue(undefined),
  getLatestWeeklyReport: vi.fn().mockResolvedValue(null),
}))

// Mock HTMLDialogElement for jsdom
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
    this.dispatchEvent(new Event('close')) // Mock dispatch for any listener
  })
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  })
})

import { ScoreRing, EmissionBadge, KineticBar } from '@/components/shared/ScoreRing'
import { XaiCard } from '@/components/ai/XaiCard'
import { SkeletonCard, SkeletonList, ErrorState, OfflineBanner } from '@/components/shared/StateFeedback'
import { FloatingNav } from '@/components/layout/FloatingNav'
import { CoachClient } from '@/features/chat/CoachClient'

describe('WCAG AA Accessibility Integration Tests', () => {
  describe('Semantic Markup & Accessibility Attributes', () => {
    it('ScoreRing has appropriate aria-label and role, and hides center visual text', () => {
      const { container } = render(
        <ScoreRing score={82} label="Good" sublabel="Emissions look fine" animated={false} />
      )
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('aria-label', 'Carbon score: 82 out of 100')
      expect(svg).toHaveAttribute('role', 'img')

      // Visual text container must be hidden from screen readers to prevent duplication
      const textContainer = container.querySelector('.absolute.inset-0')
      expect(textContainer).toHaveAttribute('aria-hidden', 'true')
    })

    it('EmissionBadge announces trend directions to screen readers', () => {
      const { rerender } = render(<EmissionBadge kg={4.5} trend="down" />)
      expect(screen.getByText('(decreasing)')).toBeInTheDocument()
      expect(screen.queryByText('(increasing)')).not.toBeInTheDocument()

      rerender(<EmissionBadge kg={12.8} trend="up" />)
      expect(screen.getByText('(increasing)')).toBeInTheDocument()
      expect(screen.queryByText('(decreasing)')).not.toBeInTheDocument()
    })

    it('KineticBar has progressbar semantics', () => {
      render(<KineticBar value={65} label="Transport progress" />)
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '65')
      expect(progressbar).toHaveAttribute('aria-valuemin', '0')
      expect(progressbar).toHaveAttribute('aria-valuemax', '100')
      expect(progressbar).toHaveAttribute('aria-label', 'Transport progress')
    })

    it('XaiCard sections have ARIA disclosures, controls, and regions', () => {
      const mockExplanation = {
        id: 'rec-1',
        title: 'Reduce Commuter Emissions',
        category: 'transport' as const,
        priority: 'high' as const,
        confidence: 0.9,
        potentialSavingsKg: 15.4,
        explanation: 'Commuting by SUV is currently high.',
        observation: 'Your SUV commuting emitted 45kg CO2 this week.',
        reasoning: 'SUVs consume more fuel per kilometer than alternative transport.',
        recommendation: 'Use public transit or carpool twice a week.',
        impact: 'Saves around 15.4kg CO2 weekly.',
        rankingScore: 8.5,
        calculationDetails: '45kg SUV - 29.6kg transit = 15.4kg',
        generatedAt: new Date().toISOString(),
      }

      const { container } = render(<XaiCard explanation={mockExplanation} showAuditTrail={true} />)

      // Test Observation section disclosure button
      const button = screen.getByRole('button', { name: /observation/i })
      expect(button).toHaveAttribute('aria-expanded', 'false')

      const panelId = button.getAttribute('aria-controls')
      expect(panelId).toBe('xai-section-observation')

      // Click button to open disclosure
      fireEvent.click(button)
      expect(button).toHaveAttribute('aria-expanded', 'true')

      // Region must be present with matching ID and label
      const region = container.querySelector(`#${panelId}`)
      expect(region).toHaveAttribute('role', 'region')
      expect(region).toHaveAttribute('aria-label', 'Observation')
    })
  })

  describe('Keyboard-only and Non-Visual Interactions', () => {
    it('Skeleton placeholders are hidden from screen readers', () => {
      const { container: cardContainer } = render(<SkeletonCard />)
      expect(cardContainer.firstChild).toHaveAttribute('aria-hidden', 'true')

      const { container: listContainer } = render(<SkeletonList count={3} />)
      expect(listContainer.firstChild).toHaveAttribute('aria-hidden', 'true')
    })

    it('ErrorState utilizes alert role', () => {
      render(<ErrorState message="Could not fetch goals." onRetry={() => {}} />)
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
      expect(screen.getByText('Could not fetch goals.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry connection/i })).toBeInTheDocument()
    })

    it('OfflineBanner uses role="status" and is assertive', () => {
      render(<OfflineBanner isOnline={false} />)
      const banner = screen.getByRole('status')
      expect(banner).toHaveAttribute('aria-live', 'assertive')
    })
  })

  describe('Semantic List Structures', () => {
    it('FloatingNav implements navigation elements inside native list items', () => {
      render(<FloatingNav />)
      // Desktop and mobile navigation elements
      const navs = screen.getAllByRole('navigation')
      expect(navs.length).toBeGreaterThan(0)

      // FloatNav must contain semantic lists
      const lists = screen.getAllByRole('list')
      expect(lists.length).toBeGreaterThan(0)
      
      const listItems = screen.getAllByRole('listitem')
      expect(listItems.length).toBeGreaterThan(0)
    })
  })

  describe('Native Dialog Modals', () => {
    it('CoachClient renders settings in a native dialog element', () => {
      render(<CoachClient />)
      
      // Let's look for the settings dialog
      const dialog = document.querySelector('dialog')
      expect(dialog).toBeInTheDocument()
      expect(dialog).toHaveAttribute('aria-labelledby', 'settings-modal-title')
    })
  })
})
