import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { SkeletonCard } from '@/components/shared/StateFeedback'

export const metadata: Metadata = {
  title: 'AI Coach — Rootly',
  description: 'Context-aware sustainability coaching powered by Claude AI. Get personalized carbon reduction recommendations based on your actual data.',
}

const CoachClient = dynamic(
  () => import('@/features/chat/CoachClient').then((mod) => mod.CoachClient),
  {
    loading: () => (
      <div className="relative min-h-screen px-4 md:px-16 py-8 max-w-5xl mx-auto space-y-6">
        <div className="space-y-2 mb-8 animate-pulse">
          <div className="h-3 w-48 bg-surface-container-highest/60 rounded" />
          <div className="h-10 w-64 bg-surface-container-highest/60 rounded" />
        </div>
        <SkeletonCard className="h-64" />
      </div>
    ),
  }
)

export default function CoachPage() {
  return <CoachClient />
}
