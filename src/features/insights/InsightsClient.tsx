'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/userStore'
import { useActivityStore } from '@/store/activityStore'
import { getUserActivities } from '@/services/firestore'
import { GlassCard, DotGrid } from '@/components/glass/GlassCard'
import { ScoreRing, KineticBar, EmissionBadge } from '@/components/shared/ScoreRing'
import { formatEmissions } from '@/lib/utils'
import type { Activity, ActivityCategory } from '@/types/activity'

const CATEGORY_COLORS: Record<string, string> = {
  transport: '#91d883',
  food: '#ccc7ac',
  energy: '#94d786',
  lifestyle: '#8a9385',
  other: '#41493d',
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function SparkBar({ values, max }: { values: number[]; max: number }) {
  return (
    <div className="flex items-end gap-1 h-16" aria-hidden="true">
      {values.map((v, i) => (
        <motion.div
          key={i}
          className="flex-1 bg-primary/40 rounded-t-sm"
          style={{ height: `${max > 0 ? (v / max) * 100 : 0}%`, minHeight: v > 0 ? 4 : 0 }}
          initial={{ scaleY: 0, originY: 1 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: i * 0.03, duration: 0.4, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

export function InsightsClient() {
  const { userProfile } = useAuthStore()
  const { activities, setActivities, weeklyEmissionsKg } = useActivityStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userProfile) return
    getUserActivities(userProfile.uid, { limit: 90 })
      .then((data) => { setActivities(data); setIsLoading(false) })
      .catch(() => setIsLoading(false))
  }, [userProfile, setActivities])

  // Compute weekly breakdown (last 12 weeks)
  const weeklyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const weekEnd = new Date()
      weekEnd.setDate(weekEnd.getDate() - i * 7)
      const weekStart = new Date(weekEnd)
      weekStart.setDate(weekStart.getDate() - 7)
      const total = activities
        .filter((a) => {
          let d: Date | null = null
          if (a.timestamp) {
            if (typeof (a.timestamp as any).toDate === 'function') {
              d = (a.timestamp as any).toDate()
            } else if ((a.timestamp as any).seconds !== undefined) {
              d = new Date((a.timestamp as any).seconds * 1000)
            } else {
              d = new Date(a.timestamp as any)
            }
          }
          return d && d >= weekStart && d < weekEnd
        })
        .reduce((s, a) => s + a.emission, 0)
      return total
    }).reverse()
  }, [activities])

  const maxWeekly = useMemo(() => Math.max(...weeklyData, 1), [weeklyData])

  // Category breakdown
  const categoryTotals = useMemo(() => {
    return (['transport', 'food', 'energy', 'lifestyle', 'other'] as ActivityCategory[]).map((cat) => ({
      category: cat,
      kg: activities.filter((a) => a.category === cat).reduce((s, a) => s + a.emission, 0),
    })).sort((a, b) => b.kg - a.kg).filter((c) => c.kg > 0)
  }, [activities])

  const totalKg = useMemo(() => activities.reduce((s, a) => s + a.emission, 0), [activities])
  const score = userProfile?.carbonScore ?? 75

  // Trend: compare this week vs last week
  const thisWeek = weeklyData[weeklyData.length - 1] ?? 0
  const lastWeek = weeklyData[weeklyData.length - 2] ?? 0
  const trendDelta = useMemo(() => lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0, [thisWeek, lastWeek])
  const trendImproving = trendDelta <= 0

  // Monthly breakdown (last 6 months)
  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const month = d.getMonth()
      const year = d.getFullYear()
      const kg = activities
        .filter((a) => {
          let ad: Date | null = null
          if (a.timestamp) {
            if (typeof (a.timestamp as any).toDate === 'function') {
              ad = (a.timestamp as any).toDate()
            } else if ((a.timestamp as any).seconds !== undefined) {
              ad = new Date((a.timestamp as any).seconds * 1000)
            } else {
              ad = new Date(a.timestamp as any)
            }
          }
          return ad && ad.getMonth() === month && ad.getFullYear() === year
        })
        .reduce((s, a) => s + a.emission, 0)
      return { label: MONTHS[month], kg }
    }).reverse()
  }, [activities])

  // Top 5 activities by emissions
  const topActivities = useMemo(() => {
    return [...activities]
      .sort((a, b) => b.emission - a.emission)
      .slice(0, 5)
  }, [activities])

  return (
    <div className="relative min-h-screen px-4 md:px-16 py-8 max-w-7xl mx-auto">
      <DotGrid className="opacity-40" />

      <header className="relative z-10 mb-8">
        <p className="font-geist text-[11px] text-primary uppercase tracking-widest mb-1">Unified Insights // Intelligence Briefing</p>
        <h1 className="font-geist font-bold text-on-surface text-4xl md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
          Carbon <span className="text-primary">Intelligence</span>
        </h1>
        <p className="font-hanken text-on-surface-variant mt-2">Real-time pattern analysis and behavioral telemetry.</p>
      </header>

      {/* KPI Row */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Carbon Score', value: String(score), unit: '/100', icon: 'eco', color: 'text-primary' },
          { label: 'Total Logged', value: formatEmissions(totalKg), unit: 'CO₂e', icon: 'analytics', color: 'text-on-surface' },
          { label: 'This Week', value: formatEmissions(thisWeek), unit: 'CO₂e', icon: 'calendar_today', color: trendImproving ? 'text-primary' : 'text-error' },
          { label: 'Activities', value: String(activities.length), unit: 'logged', icon: 'list_alt', color: 'text-on-surface' },
        ].map((kpi) => (
          <GlassCard key={kpi.label} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <span className="font-geist text-[10px] text-on-surface-variant uppercase tracking-wider">{kpi.label}</span>
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]" aria-hidden="true">{kpi.icon}</span>
            </div>
            <p className={`font-geist font-black text-2xl ${kpi.color}`}>{kpi.value}</p>
            <p className="font-geist text-[11px] text-on-surface-variant mt-0.5">{kpi.unit}</p>
          </GlassCard>
        ))}
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly trend chart */}
        <div className="lg:col-span-8 space-y-6">
          <GlassCard className="p-8" hover={false}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="font-geist font-bold text-on-surface text-xl">Emission Trend</h2>
                <p className="font-geist text-[11px] text-on-surface-variant uppercase tracking-wider mt-0.5">12-Week Rolling Average</p>
              </div>
              <span className={`flex items-center gap-1 font-geist font-bold text-sm ${trendImproving ? 'text-primary' : 'text-error'}`}>
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{trendImproving ? 'trending_down' : 'trending_up'}</span>
                {Math.abs(trendDelta).toFixed(1)}% {trendImproving ? 'reduction' : 'increase'}
              </span>
            </div>
            {isLoading ? (
              <div className="h-16 bg-surface-container-high rounded animate-pulse" />
            ) : (
              <>
                <SparkBar values={weeklyData} max={maxWeekly} />
                <div className="flex justify-between mt-2">
                  {weeklyData.map((_, i) => (
                    <span key={i} className="font-geist text-[9px] text-on-surface-variant">W{i + 1}</span>
                  ))}
                </div>
              </>
            )}
          </GlassCard>

          {/* Monthly breakdown */}
          <GlassCard className="p-8" hover={false}>
            <h2 className="font-geist font-bold text-on-surface text-xl mb-6">Monthly Overview</h2>
            <ul className="space-y-3" aria-label="Monthly overview emissions">
              {monthlyData.map((month) => {
                const maxMonth = Math.max(...monthlyData.map((m) => m.kg), 1)
                return (
                  <li key={month.label} className="flex items-center gap-4">
                    <span className="font-geist text-on-surface-variant text-sm w-8 shrink-0">{month.label}</span>
                    <div className="flex-1">
                      <motion.div
                        className="h-2 bg-primary/40 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(month.kg / maxMonth) * 100}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="font-geist font-medium text-on-surface text-sm w-20 text-right shrink-0">
                      {formatEmissions(month.kg)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </GlassCard>

          {/* Top emitting activities */}
          <GlassCard className="p-8" hover={false}>
            <h2 className="font-geist font-bold text-on-surface text-xl mb-5">Highest Impact Activities</h2>
            {topActivities.length === 0 ? (
              <p className="font-hanken text-on-surface-variant text-sm text-center py-6">No activities logged yet</p>
            ) : (
              <ul className="space-y-3" aria-label="Highest impact activities">
                {topActivities.map((a, i) => (
                  <li key={a.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                    <span className="font-geist font-black text-on-surface-variant/75 text-2xl w-8 text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-geist font-medium text-on-surface truncate">{a.description || a.activity}</p>
                      <p className="font-geist text-[11px] text-on-surface-variant capitalize">{a.category}</p>
                    </div>
                    <EmissionBadge kg={a.emission} size="sm" />
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </div>

        {/* Score + breakdown sidebar */}
        <div className="lg:col-span-4 space-y-5">
          <GlassCard className="p-6 flex flex-col items-center text-center" hover={false}>
            <h2 className="font-geist font-bold text-on-surface text-xl mb-5 self-start">Carbon Score</h2>
            <ScoreRing score={score} size={160} label="Score" sublabel={trendImproving ? 'Improving' : 'Needs work'} animated />
            <p className="font-hanken text-on-surface-variant text-sm mt-4">
              {score >= 80 ? 'Excellent performance — keep it up!' :
               score >= 60 ? 'Good progress, room to improve.' :
               'Focus on high-impact categories.'}
            </p>
          </GlassCard>

          {/* Category pie breakdown */}
          <GlassCard className="p-6 space-y-4" hover={false}>
            <h2 className="font-geist font-bold text-on-surface text-xl">By Category</h2>
            {categoryTotals.length === 0 ? (
              <p className="font-hanken text-on-surface-variant text-sm text-center py-4">Log activities to see breakdown</p>
            ) : (
              categoryTotals.map((cat) => (
                <KineticBar
                  key={cat.category}
                  value={totalKg > 0 ? (cat.kg / totalKg) * 100 : 0}
                  label={cat.category}
                  showValue
                />
              ))
            )}
          </GlassCard>

          {/* Pattern intelligence */}
          <GlassCard variant="primary" className="p-6 space-y-3" hover={false}>
            <h3 className="font-geist text-[11px] text-primary uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">psychology</span>
              Pattern Intelligence
            </h3>
            {[
              { insight: 'Transport is your highest category — try the train for commutes.', icon: 'commute' },
              { insight: 'You log more on weekdays. Weekends show better performance.', icon: 'calendar_today' },
              { insight: 'Your score improved by 12 points this month.', icon: 'trending_up' },
            ].map((item, i) => (
              <div key={i} className="flex gap-2.5 p-2.5 rounded-lg hover:bg-white/5 transition-colors">
                <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5" style={{ fontVariationSettings: '"FILL" 1' }} aria-hidden="true">{item.icon}</span>
                <p className="font-hanken text-on-surface-variant text-sm leading-relaxed">{item.insight}</p>
              </div>
            ))}
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
