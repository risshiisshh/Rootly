import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { SkeletonCard } from '@/components/shared/StateFeedback'

export const metadata: Metadata = {
  title: 'Voice Logging — Rootly',
  description: 'Speak your activities naturally. Rootly AI extracts, quantifies and categorizes your carbon emissions from your words.',
}

const VoiceClient = dynamic(
  () => import('@/features/voice/VoiceClient').then((mod) => mod.VoiceClient),
  {
    loading: () => (
      <div className="relative min-h-screen px-4 md:px-16 py-8 max-w-6xl mx-auto space-y-6">
        <div className="space-y-2 mb-8 animate-pulse">
          <div className="h-3 w-48 bg-surface-container-highest/60 rounded" />
          <div className="h-10 w-64 bg-surface-container-highest/60 rounded" />
        </div>
        <SkeletonCard className="h-64" />
      </div>
    ),
  }
)

export default function VoicePage() {
  return <VoiceClient />
}
