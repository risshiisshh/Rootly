'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { GlassCard, DotGrid } from '@/components/glass/GlassCard'
import { useAuthStore } from '@/store/userStore'
import { formatRelativeTime } from '@/lib/utils'

interface DailyMetric {
  date: string
  counts: Record<string, number>
  uniqueUsers: string[]
}

const EVENT_COLORS: Record<string, string> = {
  USER_LOGIN: '#91d883', // primary
  ACTIVITY_LOGGED: '#ccc7ac', // tertiary
  VOICE_LOGGING: '#94d786', // secondary
  CHAT_USAGE: '#8a9385', // secondary variant
  ROUTE_COMPARISON: '#41493d', // outline
  GOAL_COMPLETION: '#5ca250', // success green
  REPORT_GENERATION: '#7d867c',
  RECOMMENDATION_ACCEPTANCE: '#d1e2d3',
}

const EVENT_LABELS: Record<string, string> = {
  USER_LOGIN: 'Logins',
  ACTIVITY_LOGGED: 'Activities',
  VOICE_LOGGING: 'Voice Logs',
  CHAT_USAGE: 'Chat coach',
  ROUTE_COMPARISON: 'Routes checked',
  GOAL_COMPLETION: 'Goals completed',
  REPORT_GENERATION: 'Reports compiled',
  RECOMMENDATION_ACCEPTANCE: 'Adoptions',
}

export function AnalyticsClient() {
  const { userProfile } = useAuthStore()
  const [metrics, setMetrics] = useState<DailyMetric[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMetrics = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const firebaseUser = useAuthStore.getState().firebaseUser
      const token = firebaseUser ? await firebaseUser.getIdToken() : null

      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch('/api/analytics', { headers })
      if (!res.ok) throw new Error('Failed to load system metrics')
      const data = await res.json()
      setMetrics(data.dailyMetrics || [])
    } catch (err: any) {
      console.error(err)
      setError('Analytics telemetry offline. Please retry.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMetrics()
  }, [])

  // Aggregate totals
  const aggregates = useMemo(() => {
    const totals: Record<string, number> = {
      USER_LOGIN: 0,
      ACTIVITY_LOGGED: 0,
      VOICE_LOGGING: 0,
      CHAT_USAGE: 0,
      ROUTE_COMPARISON: 0,
      GOAL_COMPLETION: 0,
      REPORT_GENERATION: 0,
      RECOMMENDATION_ACCEPTANCE: 0,
    }

    let totalEvents = 0
    const allUsers = new Set<string>()

    metrics.forEach((day) => {
      Object.keys(totals).forEach((key) => {
        const count = day.counts[key] || 0
        totals[key] += count
        totalEvents += count
      })
      if (day.uniqueUsers) {
        day.uniqueUsers.forEach((u) => allUsers.add(u))
      }
    })

    const totalUniqueUsers = allUsers.size || 1

    return {
      totals,
      totalEvents,
      uniqueUsersCount: allUsers.size,
      avgEventsPerUser: (totalEvents / totalUniqueUsers).toFixed(1),
    }
  }, [metrics])

  // Conversion funnel computations
  const funnel = useMemo(() => {
    const generated = aggregates.totals['REPORT_GENERATION'] || 1
    const accepted = aggregates.totals['RECOMMENDATION_ACCEPTANCE'] || 0
    const completed = aggregates.totals['GOAL_COMPLETION'] || 0

    const acceptanceRate = Math.round((accepted / generated) * 100)
    const completionRate = Math.round((completed / (accepted || 1)) * 100)

    return {
      acceptanceRate: Math.min(acceptanceRate, 100),
      completionRate: Math.min(completionRate, 100),
    }
  }, [aggregates])

  const maxDailyCount = useMemo(() => {
    if (metrics.length === 0) return 1
    return Math.max(
      ...metrics.map((m) =>
        Object.values(m.counts).reduce((sum, v) => sum + v, 0)
      ),
      1
    )
  }, [metrics])

  return (
    <div className="relative min-h-screen px-4 md:px-16 py-8 max-w-5xl mx-auto overflow-hidden">
      <DotGrid className="opacity-40" />

      {/* Header */}
      <div className="relative z-10 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <p className="font-geist text-[11px] text-primary uppercase tracking-widest mb-1">
            System Telemetry & Operations
          </p>
          <h1
            className="font-geist font-bold text-on-surface text-3xl md:text-4xl"
            style={{ letterSpacing: '-0.03em' }}
          >
            Product <span className="text-primary">Analytics</span>
          </h1>
          <p className="font-hanken text-on-surface-variant text-sm mt-1">
            Auditing feature engagement, adoption metrics, and funnel conversion rates
          </p>
        </div>
        <button
          onClick={loadMetrics}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-4 py-2 bg-surface-container-high/60 hover:bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface transition-all text-xs font-geist font-bold uppercase tracking-wider disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[16px] animate-spin-slow">refresh</span>
          Sync Telemetry
        </button>
      </div>

      {isLoading ? (
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="font-geist text-xs text-on-surface-variant uppercase tracking-wider">Syncing operational data...</p>
        </div>
      ) : error ? (
        <div className="relative z-10">
          <GlassCard className="p-8 text-center max-w-md mx-auto" hover={false}>
            <span className="material-symbols-outlined text-4xl text-error mb-4">cloud_off</span>
            <h3 className="font-geist font-bold text-on-surface text-lg">Operational Error</h3>
            <p className="font-hanken text-on-surface-variant text-sm mt-2 mb-6">{error}</p>
            <button
              onClick={loadMetrics}
              className="px-6 py-2 bg-primary text-on-primary rounded-lg font-geist text-xs font-bold uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all"
            >
              Retry Sync
            </button>
          </GlassCard>
        </div>
      ) : (
        <div className="relative z-10 space-y-6">
          {/* Key Aggregates Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <GlassCard className="p-6 relative overflow-hidden" hover>
              <div className="flex items-center justify-between mb-4">
                <span className="font-geist text-[10px] text-on-surface-variant uppercase tracking-widest">
                  Daily Active Users
                </span>
                <span className="material-symbols-outlined text-primary text-lg">group</span>
              </div>
              <p className="font-geist font-black text-4xl text-on-surface">
                {aggregates.uniqueUsersCount}
              </p>
              <p className="font-hanken text-xs text-primary mt-2">
                Unique anonymized user keys
              </p>
            </GlassCard>

            <GlassCard className="p-6 relative overflow-hidden" hover>
              <div className="flex items-center justify-between mb-4">
                <span className="font-geist text-[10px] text-on-surface-variant uppercase tracking-widest">
                  Total System Events
                </span>
                <span className="material-symbols-outlined text-primary text-lg">analytics</span>
              </div>
              <p className="font-geist font-black text-4xl text-on-surface">
                {aggregates.totalEvents}
              </p>
              <p className="font-hanken text-xs text-primary mt-2">
                Actions batched & recorded
              </p>
            </GlassCard>

            <GlassCard className="p-6 relative overflow-hidden" hover>
              <div className="flex items-center justify-between mb-4">
                <span className="font-geist text-[10px] text-on-surface-variant uppercase tracking-widest">
                  Avg Events / User
                </span>
                <span className="material-symbols-outlined text-primary text-lg">speed</span>
              </div>
              <p className="font-geist font-black text-4xl text-on-surface">
                {aggregates.avgEventsPerUser}
              </p>
              <p className="font-hanken text-xs text-primary mt-2">
                Engagement index per identity
              </p>
            </GlassCard>
          </div>

          {/* Charts & Funnel row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Daily Trend chart */}
            <div className="lg:col-span-8">
              <GlassCard className="p-6 h-full flex flex-col" hover={false}>
                <h2 className="font-geist text-[11px] font-bold uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px]">timeline</span>
                  Daily Event Activity
                </h2>
                {metrics.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center min-h-[200px]">
                    <p className="font-hanken text-sm text-on-surface-variant">No tracking data in selected range</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-end gap-6 pt-4 min-h-[220px]">
                    <div className="flex items-end justify-between h-48 gap-4 px-2">
                      {metrics.map((day) => {
                        const dayTotal = Object.values(day.counts).reduce((a, b) => a + b, 0)
                        const heightPct = (dayTotal / maxDailyCount) * 100
                        return (
                          <div key={day.date} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                            {/* Hover info tooltip */}
                            <div className="absolute bottom-full mb-2 bg-surface-container border border-outline-variant/30 rounded-lg p-2.5 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none min-w-[140px] text-xs">
                              <p className="font-geist font-bold mb-1.5 border-b border-outline-variant/15 pb-1 text-on-surface">{day.date}</p>
                              {Object.entries(day.counts).map(([type, count]) => (
                                <div key={type} className="flex items-center justify-between text-[10px] py-0.5">
                                  <span className="text-on-surface-variant">{EVENT_LABELS[type] || type}:</span>
                                  <span className="font-mono font-bold" style={{ color: EVENT_COLORS[type] }}>{count}</span>
                                </div>
                              ))}
                              <div className="border-t border-outline-variant/15 mt-1 pt-1 flex items-center justify-between font-bold">
                                <span>Total:</span>
                                <span>{dayTotal}</span>
                              </div>
                            </div>
                            
                            {/* Stacked bar representing events */}
                            <div className="w-full bg-white/5 rounded-t-lg overflow-hidden flex flex-col-reverse justify-start transition-all group-hover:bg-white/10" style={{ height: `${Math.max(heightPct, 4)}%` }}>
                              {Object.entries(day.counts).map(([type, count]) => {
                                const pct = dayTotal > 0 ? (count / dayTotal) * 100 : 0
                                return (
                                  <div
                                    key={type}
                                    style={{ height: `${pct}%`, backgroundColor: EVENT_COLORS[type] }}
                                    className="w-full opacity-85 hover:opacity-100 transition-opacity"
                                  />
                                )
                              })}
                            </div>
                            
                            <span className="font-geist text-[9px] text-on-surface-variant uppercase mt-2 tracking-tighter">
                              {day.date.slice(5)}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Chart Legend */}
                    <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-white/5 pt-4 px-2">
                      {Object.entries(EVENT_LABELS).map(([type, label]) => (
                        <div key={type} className="flex items-center gap-1.5 text-[10px] text-on-surface-variant">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: EVENT_COLORS[type] }} />
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>

            {/* Conversion Funnel */}
            <div className="lg:col-span-4">
              <GlassCard className="p-6 h-full flex flex-col" hover={false}>
                <h2 className="font-geist text-[11px] font-bold uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px]">filter_alt</span>
                  Funnel Conversion
                </h2>
                <div className="flex-1 flex flex-col justify-around gap-6">
                  {/* Step 1: Reports Generated */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-geist font-bold text-on-surface uppercase tracking-wide">1. Intelligence Briefings</span>
                      <span className="font-mono text-on-surface-variant">{aggregates.totals['REPORT_GENERATION'] || 0}</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                      <div className="bg-primary/50 h-3 rounded-full w-full" />
                    </div>
                  </div>

                  {/* Step 2: Recommendations Committed */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-geist font-bold text-on-surface uppercase tracking-wide">2. Recommendations Adopted</span>
                      <span className="font-mono text-on-surface-variant">
                        {aggregates.totals['RECOMMENDATION_ACCEPTANCE'] || 0} ({funnel.acceptanceRate}%)
                      </span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                      <motion.div
                        className="bg-primary h-3 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${funnel.acceptanceRate}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>

                  {/* Step 3: Goals Completed */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-geist font-bold text-on-surface uppercase tracking-wide">3. Goals Completed</span>
                      <span className="font-mono text-on-surface-variant">
                        {aggregates.totals['GOAL_COMPLETION'] || 0} ({funnel.completionRate}%)
                      </span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                      <motion.div
                        className="bg-primary/80 h-3 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${funnel.completionRate}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-4 text-center">
                    <p className="font-hanken text-[11px] text-on-surface-variant leading-relaxed">
                      Recommendations committed: <strong className="text-primary">{funnel.acceptanceRate}%</strong><br />
                      Adopted objectives completed: <strong className="text-primary">{funnel.completionRate}%</strong>
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Feature engagement distribution table */}
          <GlassCard className="p-6" hover={false}>
            <h2 className="font-geist text-[11px] font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">view_list</span>
              Feature Utilization Matrix
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-hanken text-on-surface-variant border-collapse">
                <thead>
                  <tr className="border-b border-white/5 font-geist uppercase text-[9px] tracking-wider text-on-surface">
                    <th className="py-3 px-2">Feature / Module</th>
                    <th className="py-3 px-2 text-right">Event Key</th>
                    <th className="py-3 px-2 text-right">Aggregated Count</th>
                    <th className="py-3 px-2 text-right">Engagement Share</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(EVENT_LABELS).map(([type, label]) => {
                    const count = aggregates.totals[type] || 0
                    const pct = aggregates.totalEvents > 0 ? ((count / aggregates.totalEvents) * 100).toFixed(1) : '0.0'
                    return (
                      <tr key={type} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-2 flex items-center gap-2 font-medium text-on-surface">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: EVENT_COLORS[type] }} />
                          {label}
                        </td>
                        <td className="py-3.5 px-2 text-right font-mono text-[10px] text-on-surface-variant/80">{type}</td>
                        <td className="py-3.5 px-2 text-right font-mono font-bold text-on-surface">{count}</td>
                        <td className="py-3.5 px-2 text-right font-mono">{pct}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
