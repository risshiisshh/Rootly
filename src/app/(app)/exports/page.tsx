import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { SkeletonCard } from '@/components/shared/StateFeedback'

export const metadata: Metadata = {
  title: 'Data Exports — Rootly',
  description: 'Export your carbon footprint data as JSON, CSV, or PDF report for compliance and external analysis.',
}

const ExportsClient = dynamic(
  () => import('@/features/exports/ExportsClient').then((mod) => mod.ExportsClient),
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

export default function ExportsPage() {
  return <ExportsClient />
}
