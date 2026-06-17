import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { SkeletonCard } from '@/components/shared/StateFeedback'

export const metadata: Metadata = {
  title: 'Weekly Report — Rootly',
  description: 'Your AI-generated weekly carbon intelligence briefing. Personalized analysis, optimization deltas, and tactical objectives.',
}

const ReportsClient = dynamic(
  () => import('@/features/reports/ReportsClient').then((mod) => mod.ReportsClient),
  {
    loading: () => (
      <div className="relative min-h-screen px-4 md:px-16 py-8 max-w-7xl mx-auto space-y-6">
        <div className="space-y-2 mb-8 animate-pulse">
          <div className="h-3 w-48 bg-surface-container-highest/60 rounded" />
          <div className="h-10 w-64 bg-surface-container-highest/60 rounded" />
        </div>
        <SkeletonCard className="h-64" />
      </div>
    ),
  }
)

export default function ReportsPage() {
  return <ReportsClient />
}
