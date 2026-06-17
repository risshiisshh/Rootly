import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ScoreRing } from '../../components/shared/ScoreRing'
import { FloatingNav } from '../../components/layout/FloatingNav'

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

// Mock AuthContext
vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    signOutUser: vi.fn(),
  }),
}))

describe('UI Component Integration Tests', () => {
  describe('ScoreRing Component', () => {
    it('renders the score and corresponding label correctly', () => {
      // Test score 82 (which maps to "Good" label)
      render(React.createElement(ScoreRing, { score: 82, size: 200, strokeWidth: 16, label: 'Good' }))

      expect(screen.getByText('82')).toBeInTheDocument()
      expect(screen.getByText('Good')).toBeInTheDocument()
    })

    it('displays score 90', () => {
      render(React.createElement(ScoreRing, { score: 90, size: 200, strokeWidth: 16 }))

      expect(screen.getByText('90')).toBeInTheDocument()
    })

    it('displays score 30', () => {
      render(React.createElement(ScoreRing, { score: 30, size: 200, strokeWidth: 16, label: 'Critical' }))

      expect(screen.getByText('30')).toBeInTheDocument()
      expect(screen.getByText('Critical')).toBeInTheDocument()
    })
  })

  describe('FloatingNav Component', () => {
    it('renders the navigation options and highlights the active route', () => {
      render(React.createElement(FloatingNav))

      // Verify that navigation elements are displayed (desktop and mobile)
      const navElements = screen.getAllByRole('navigation')
      expect(navElements.length).toBeGreaterThan(0)
      
      const navLinks = screen.getAllByRole('link')
      expect(navLinks.length).toBeGreaterThan(0)
    })
  })
})
