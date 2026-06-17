import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { SkeletonCard } from '@/components/shared/StateFeedback'

export const metadata: Metadata = {
  title: 'Operator Profile — Rootly',
  description: 'Your sustainability profile, achievements, activity heatmap and account settings.',
}

const ProfileClient = dynamic(
  () => import('@/features/profile/ProfileClient').then((mod) => mod.ProfileClient),
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

export default function ProfilePage() {
  return <ProfileClient />
}
