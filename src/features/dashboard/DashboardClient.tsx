'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/store/userStore'
import { useActivityStore } from '@/store/activityStore'
import { getUserActivities, getWeeklyActivities } from '@/services/firestore'
import { GlassCard, DotGrid } from '@/components/glass/GlassCard'
import { ScoreRing, EmissionBadge, KineticBar } from '@/components/shared/ScoreRing'
import { formatEmissions, formatRelativeTime } from '@/lib/utils'
import { CATEGORY_ICONS, ROUTES, WEEKLY_TARGET_KG } from '@/lib/constants'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import {
  SkeletonPulse,
  SkeletonCard,
  SkeletonList,
  SkeletonCircle,
  ErrorState,
  EmptyState,
} from '@/components/shared/StateFeedback'
import Link from 'next/link'
import type { Activity } from '@/types/activity'

const QUICK_ACTIONS = [
  { label: 'Log Activity', href: ROUTES.ACTIVITY, icon: 'edit_note', description: 'Manual entry' },
  { label: 'AI Coach', href: ROUTES.COACH, icon: 'psychology', description: 'Get advice' },
  { label: 'Voice Log', href: ROUTES.VOICE, icon: 'mic', description: 'Speak & log' },
  { label: 'Route Check', href: ROUTES.ROUTES, icon: 'route', description: 'Compare CO₂' },
]

export function DashboardClient() {
  const { userProfile } = useAuthStore()
  const { activities, weeklyEmissionsKg, setActivities } = useActivityStore()
  const [recentActivities, setRecentActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isOnline = useOnlineStatus()

  const loadData = useCallback(async () => {
    if (!userProfile) return
    setIsLoading(true)
    setError(null)
    try {
      const [allActivities, weeklyActivities] = await Promise.all([
        getUserActivities(userProfile.uid, { limit: 5 }),
        getWeeklyActivities(userProfile.uid),
      ])
      setRecentActivities(allActivities)
      setActivities(weeklyActivities)
    } catch (err) {
      console.error('Failed to load activities:', err)
      setError('Telemetry database unreachable. Please check your network link or Firestore configuration.')
    } finally {
      setIsLoading(false)
    }
  }, [userProfile, setActivities])

  useEffect(() => {
    loadData()
  }, [loadData])

  const score = userProfile?.carbonScore ?? 75
  const weeklyGoal = userProfile?.weeklyGoalKg ?? 100
  const weeklyProgress = Math.min((weeklyEmissionsKg / weeklyGoal) * 100, 100)
  const targetProgress = Math.min((weeklyEmissionsKg / WEEKLY_TARGET_KG) * 100, 100)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  if (error) {
    return (
      <div className="relative min-h-screen px-4 md:px-16 py-8 max-w-7xl mx-auto flex flex-col justify-center items-center">
        <DotGrid className="opacity-50" />
        <ErrorState
          title="Telemetry Link Offline"
          message={error}
          onRetry={loadData}
          retryLabel="Retry Connection"
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="relative min-h-screen px-4 md:px-16 py-8 max-w-7xl mx-auto">
        <DotGrid className="opacity-30" />
        
        {/* Page header skeleton */}
        <div className="relative z-10 mb-8 space-y-2">
          <SkeletonPulse className="h-3 w-48 rounded" />
          <SkeletonPulse className="h-10 w-64 rounded" />
          <SkeletonPulse className="h-4 w-96 rounded" />
        </div>

        {/* Main grid skeleton */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Carbon Score Skeleton */}
          <GlassCard variant="primary" className="md:col-span-4 p-8 flex flex-col items-center justify-center gap-6 min-h-[300px] pointer-events-none">
            <SkeletonPulse className="h-3 w-24 rounded" />
            <SkeletonCircle size={180} />
            <div className="w-full border-t border-outline-variant/20 pt-4 grid grid-cols-2 gap-4 text-center">
              <div>
                <SkeletonPulse className="h-5 w-16 mx-auto rounded" />
                <SkeletonPulse className="h-3 w-12 mx-auto mt-2 rounded" />
              </div>
              <div>
                <SkeletonPulse className="h-5 w-16 mx-auto rounded" />
                <SkeletonPulse className="h-3 w-12 mx-auto mt-2 rounded" />
              </div>
            </div>
          </GlassCard>

          {/* Metrics + Quick Actions Skeleton */}
          <div className="md:col-span-8 grid grid-cols-1 gap-6">
            <GlassCard className="p-6 space-y-5 pointer-events-none">
              <div className="flex justify-between items-center">
                <SkeletonPulse className="h-4 w-32 rounded" />
                <SkeletonPulse className="h-3 w-20 rounded" />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <SkeletonPulse className="h-3 w-1/4 rounded" />
                  <SkeletonPulse className="h-3 w-full rounded" />
                </div>
                <div className="space-y-2">
                  <SkeletonPulse className="h-3 w-1/4 rounded" />
                  <SkeletonPulse className="h-3 w-full rounded" />
                </div>
              </div>
            </GlassCard>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="glass-card p-4 flex flex-col items-center gap-3 text-center rounded-lg pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-surface-container-highest animate-pulse shrink-0" />
                  <div className="space-y-2 w-full">
                    <SkeletonPulse className="h-3.5 w-3/4 mx-auto rounded" />
                    <SkeletonPulse className="h-2.5 w-1/2 mx-auto rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Skeleton */}
          <div className="md:col-span-8">
            <GlassCard className="p-6">
              <div className="flex justify-between items-center mb-6">
                <SkeletonPulse className="h-4 w-32 rounded" />
                <SkeletonPulse className="h-3 w-16 rounded" />
              </div>
              <SkeletonList count={3} />
            </GlassCard>
          </div>

          {/* AI Coach Skeleton */}
          <GlassCard variant="primary" className="md:col-span-4 p-6 flex flex-col gap-4 pointer-events-none">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container-highest animate-pulse shrink-0" />
              <div className="space-y-2 flex-1">
                <SkeletonPulse className="h-3 w-1/3 rounded" />
                <SkeletonPulse className="h-2 w-1/4 rounded" />
              </div>
            </div>
            <div className="flex-1 bg-surface-container/30 rounded-lg p-4 space-y-2 border border-outline-variant/5">
              <SkeletonPulse className="h-3.5 w-full rounded" />
              <SkeletonPulse className="h-3.5 w-5/6 rounded" />
              <SkeletonPulse className="h-3.5 w-4/5 rounded" />
            </div>
            <div className="h-10 w-full bg-surface-container-highest rounded-full animate-pulse" />
          </GlassCard>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen px-4 md:px-16 py-8 max-w-7xl mx-auto">
      <DotGrid className="opacity-50" />

      {/* Offline telemtry indicator */}
      {!isOnline && (
        <div className="relative z-10 mb-6 bg-error-container/10 border border-error/30 p-4 rounded-xl flex items-center justify-between text-error font-hanken text-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">cloud_off</span>
            <span>Carbon telemetry is offline. Showing cached information.</span>
          </div>
          <span className="font-geist text-[10px] uppercase font-bold tracking-wider opacity-60">LOCAL_CACHE</span>
        </div>
      )}

      {/* Page header */}
      <div className="relative z-10 mb-8">
        <p className="font-geist text-[11px] text-primary uppercase tracking-widest mb-1">
          Intelligence Dashboard // Carbon Delta Analysis
        </p>
        <h1 className="font-geist font-bold text-on-surface text-4xl md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
          {greeting}, <span className="text-primary">{userProfile?.displayName?.split(' ')[0] ?? 'there'}</span>
        </h1>
        <p className="font-hanken text-on-surface-variant mt-2">
          Your sustainability intelligence is active. Here&apos;s your current status.
        </p>
      </div>

      {/* Main grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* Carbon Score — large card */}
        <GlassCard variant="primary" className="md:col-span-4 p-8 flex flex-col items-center justify-center gap-6 min-h-[300px]">
          <div className="text-center">
            <p className="font-geist text-[10px] text-primary uppercase tracking-widest mb-4">Carbon Score</p>
            <ScoreRing
              score={score}
              size={180}
              label="Score"
              sublabel="This week"
              animated={true}
            />
          </div>
          <div className="w-full border-t border-outline-variant/20 pt-4 grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="font-geist font-bold text-on-surface text-xl">{formatEmissions(weeklyEmissionsKg)}</p>
              <p className="font-geist text-[10px] text-on-surface-variant uppercase tracking-wide">This Week</p>
            </div>
            <div>
              <p className="font-geist font-bold text-on-surface text-xl">{formatEmissions(weeklyGoal)}</p>
              <p className="font-geist text-[10px] text-on-surface-variant uppercase tracking-wide">Weekly Goal</p>
            </div>
          </div>
        </GlassCard>

        {/* Metrics + Quick Actions */}
        <div className="md:col-span-8 grid grid-cols-1 gap-6">
          {/* Emission bars */}
          <GlassCard className="p-6 space-y-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-geist font-semibold text-on-surface">Emission Status</h2>
              <Link href={ROUTES.REPORTS} className="font-geist text-[11px] text-primary uppercase tracking-widest hover:underline">
                Full Report →
              </Link>
            </div>
            <KineticBar
              value={weeklyProgress}
              label={`Weekly Goal (${formatEmissions(weeklyGoal)})`}
              showValue={true}
            />
            <KineticBar
              value={targetProgress}
              label={`Paris Target (${formatEmissions(WEEKLY_TARGET_KG)})`}
              showValue={true}
            />
            <div className="flex items-center gap-2 pt-2">
              <div className="flex h-2 w-2 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${weeklyEmissionsKg > weeklyGoal ? 'bg-error' : 'bg-primary'}`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${weeklyEmissionsKg > weeklyGoal ? 'bg-error' : 'bg-primary'}`} />
              </div>
              <p className="font-hanken text-on-surface-variant text-sm">
                {weeklyEmissionsKg > weeklyGoal
                  ? `${formatEmissions(weeklyEmissionsKg - weeklyGoal)} over your weekly goal`
                  : `${formatEmissions(weeklyGoal - weeklyEmissionsKg)} remaining in your weekly budget`}
              </p>
            </div>
          </GlassCard>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="glass-card p-4 flex flex-col items-center gap-2 text-center rounded-lg group hover:border-primary/30 transition-all active:scale-95"
              >
                <div className="w-10 h-10 rounded-full bg-primary-container/40 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">{action.icon}</span>
                </div>
                <div>
                  <p className="font-geist font-semibold text-on-surface text-sm">{action.label}</p>
                  <p className="font-hanken text-on-surface-variant text-[11px]">{action.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <GlassCard className="md:col-span-8 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-geist font-semibold text-on-surface">Recent Activity</h2>
            <Link href={ROUTES.ACTIVITY} className="font-geist text-[11px] text-primary uppercase tracking-widest hover:underline">
              View All →
            </Link>
          </div>

          {recentActivities.length === 0 ? (
            <EmptyState
              icon="monitoring"
              title="No activities recorded yet"
              description="Log your daily commuting, diet, or utility consumption to activate Rootly's carbon scoring engine."
              steps={[
                { icon: 'edit_note', title: 'Manual Entry', description: 'Log transport, food, energy, or lifestyle items.' },
                { icon: 'route', title: 'Compare Routes', description: 'Find green transit alternatives for your commutes.' },
                { icon: 'psychology', title: 'Consult AI Coach', description: 'Get suggestions tailored to your operational footprint.' }
              ]}
              action={{
                label: 'Log First Activity',
                href: ROUTES.ACTIVITY,
                icon: 'add'
              }}
            />
          ) : (
            <ul className="space-y-2" aria-label="Recent activities">
              {recentActivities.map((activity) => (
                <li
                  key={activity.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-container-high/40 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-container/20 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-[18px]" aria-hidden="true">
                        {CATEGORY_ICONS[activity.category]}
                      </span>
                    </div>
                    <div>
                      <p className="font-geist font-medium text-on-surface text-sm">{activity.description || activity.activity}</p>
                      <p className="font-hanken text-on-surface-variant text-xs">
                        {activity.timestamp?.toDate ? formatRelativeTime(activity.timestamp.toDate()) : 'Recent'}
                        {' · '}{activity.category}
                      </p>
                    </div>
                  </div>
                  <EmissionBadge kg={activity.emission} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        {/* AI Coach Prompt */}
        <GlassCard variant="primary" className="md:col-span-4 p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: '"FILL" 1' }} aria-hidden="true">psychology</span>
            </div>
            <div>
              <h2 className="font-geist font-semibold text-on-surface text-sm">AI Intelligence</h2>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
                <span className="font-geist text-[10px] text-primary uppercase tracking-wider">Active</span>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-surface-container/50 rounded-lg p-4 border border-outline-variant/10">
            <p className="font-hanken text-on-surface-variant text-sm italic leading-relaxed">
              &ldquo;{score >= 75
                ? `Strong performance this week. Your ${recentActivities[0]?.category ?? 'transport'} choices are pushing your score up. Let&apos;s optimize further.`
                : `I see opportunities to improve your score. Your top emission source needs attention — let&apos;s build a plan.`}&rdquo;
            </p>
          </div>

          <Link
            href={ROUTES.COACH}
            className="flex items-center justify-center gap-2 bg-primary text-on-primary rounded-full py-2.5 font-geist font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">chat</span>
            Open Coach
          </Link>
        </GlassCard>
      </div>
    </div>
  )
}
