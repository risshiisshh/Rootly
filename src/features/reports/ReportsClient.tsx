'use client'

import { useState, useEffect, useCallback } from 'react'
import { auth, isFirebaseConfigured } from '@/services/firebase'
import { getLatestWeeklyReport } from '@/services/firestore'
import { useAuthStore } from '@/store/userStore'
import { GlassCard, DotGrid } from '@/components/glass/GlassCard'
import { ScoreRing, KineticBar } from '@/components/shared/ScoreRing'
import { formatEmissions, getSafeLocalStorage } from '@/lib/utils'
import type { WeeklyReport } from '@/types/report'
import { ErrorState, EmptyState, SkeletonCard, SkeletonCircle, SkeletonPulse } from '@/components/shared/StateFeedback'
import { useCreateGoal } from '@/hooks/useGoals'
import { analyticsTracker } from '@/lib/analytics'

const DEMO_USER_ID = 'demo-user-id'

export function ReportsClient() {
  const { userProfile } = useAuthStore()
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const { mutate: createGoal } = useCreateGoal()
  const uid = userProfile?.uid ?? DEMO_USER_ID

  const handleCommit = useCallback((rec: any) => {
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + 14) // 14-day cycle goal

    createGoal({
      title: rec.title,
      description: rec.description,
      category: rec.category || 'other',
      targetReductionKg: rec.potentialSavingsKg,
      deadline: deadline as any,
    }, {
      onSuccess: (goalId) => {
        setToastMessage(`Goal "${rec.title}" created successfully!`)
        analyticsTracker.track('RECOMMENDATION_ACCEPTANCE', {
          recTitle: rec.title,
          category: rec.category,
          savingsKg: rec.potentialSavingsKg,
          goalId,
        })
        setTimeout(() => setToastMessage(null), 3000)
      },
      onError: (err: any) => {
        setToastMessage(`Failed to create goal: ${err.message}`)
        setTimeout(() => setToastMessage(null), 3000)
      }
    })
  }, [createGoal])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getLatestWeeklyReport(uid)
      setReport(data)
    } catch (err) {
      console.error(err)
      setError('Could not download carbon report telemetry from the cloud database.')
    } finally {
      setIsLoading(false)
    }
  }, [uid])

  useEffect(() => {
    loadData()
  }, [loadData])

  const generateReport = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      // Resolve auth token safely
      let token = 'demo-token'
      if (isFirebaseConfigured && auth.currentUser) {
        try {
          token = await auth.currentUser.getIdToken()
        } catch {
          token = 'demo-token'
        }
      }
      const customKey = getSafeLocalStorage('user_gemini_api_key')
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...(customKey ? { 'x-gemini-key': customKey } : {}),
        },
        body: JSON.stringify({ uid }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to generate report')
      }
      const data = await res.json()
      setReport(data.report)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Report generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleShare = async () => {
    if (!report) return
    const text = `Rootly Weekly Intelligence Briefing
Score: ${score}/100 (Change: ${score - prevScore >= 0 ? '+' : ''}${score - prevScore})
Emissions: ${report.totalEmissionsKg} kg CO₂e
Trend: ${report.trend}
Narrative: "${report.narrative}"
Tactical Objectives:
${report.recommendations.map(r => `- ${r.title}: ${r.description} (Savings: -${r.potentialSavingsKg} kg)`).join('\n')}`

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Rootly Weekly Intelligence Briefing',
          text: text,
        })
      } else {
        await navigator.clipboard.writeText(text)
        setToastMessage('Briefing copied to clipboard!')
        setTimeout(() => setToastMessage(null), 3000)
      }
    } catch (err) {
      console.error('Failed to share:', err)
    }
  }

  const score = report?.carbonScore ?? userProfile?.carbonScore ?? 75
  const prevScore = report?.previousScore ?? score - 5

  return (
    <div className="relative min-h-screen px-4 md:px-16 py-8 max-w-4xl mx-auto">
      <DotGrid className="opacity-40" />

      {/* Header */}
      <div className="relative z-10 mb-8 text-center">
        <span className="inline-block px-4 py-1 bg-primary-container/20 border border-primary-container/30 text-primary font-geist text-[11px] font-bold uppercase tracking-widest mb-4">
          Mission Intelligence
        </span>
        <h1 className="font-geist font-bold text-on-surface" style={{ fontSize: 'clamp(32px, 6vw, 56px)', letterSpacing: '-0.04em' }}>
          Weekly Intelligence <span className="text-primary">Briefing</span>
        </h1>
        {report && (
          <p className="font-hanken text-on-surface-variant mt-3">
            Performance cycle analysis:{' '}
            <span className="text-on-surface font-medium">
              {report.weekStart?.toDate?.()?.toLocaleDateString?.() ?? 'This week'}
              {' — '}
              {report.weekEnd?.toDate?.()?.toLocaleDateString?.() ?? 'Current'}
            </span>
          </p>
        )}
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="relative z-10 space-y-8">
          <div className="flex flex-col items-center gap-6">
            <SkeletonCircle size={220} />
            <SkeletonPulse className="h-5 w-80 mx-auto rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      ) : error ? (
        <div className="relative z-10">
          <ErrorState
            title="Report Generation Failed"
            message={error}
            onRetry={report ? generateReport : loadData}
            retryLabel={report ? "Retry Generation" : "Retry Loading"}
          />
        </div>
      ) : !report ? (
        <div className="relative z-10">
          <EmptyState
            icon="analytics"
            title="No Weekly Briefing Generated Yet"
            description="Rootly compiles your logged commutes, meals, and utility telemetry into a comprehensive carbon efficiency report each week."
            steps={[
              { icon: 'edit_note', title: 'Collect Telemetry', description: 'Log activities in travel, food, and energy categories.' },
              { icon: 'auto_awesome', title: 'Generate Briefing', description: 'AI evaluates your carbon score delta and calculates Paris Agreement metrics.' },
              { icon: 'list_alt', title: 'Review Objectives', description: 'Get actionable weekly targets to optimize carbon output.' }
            ]}
            action={{
              label: isGenerating ? "Generating Briefing..." : "Generate Briefing",
              onClick: generateReport,
              icon: "auto_awesome"
            }}
          />
        </div>
      ) : (
        <div className="relative z-10 space-y-8">
          {/* Score section */}
          <div className="flex flex-col items-center gap-6">
            <ScoreRing
              score={score}
              size={220}
              label="Carbon Score"
              sublabel="This week"
              animated
            />
            {report.narrative && (
              <div className="max-w-lg text-center">
                <p className="font-hanken text-on-surface-variant italic text-lg leading-relaxed">
                  &ldquo;{report.narrative}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Major contributors */}
            <div className="obsidian-card rounded-lg p-8 space-y-6">
              <h2 className="font-geist text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">analytics</span>
                Major Contributors
              </h2>
              {report.topContributors.map((c) => (
                <KineticBar
                  key={c.category}
                  value={c.percentage}
                  label={c.category}
                  showValue
                />
              ))}
            </div>

            {/* Score delta */}
            <div className="obsidian-card rounded-lg p-8 space-y-4">
              <h2 className="font-geist text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">trending_up</span>
                Performance Delta
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="font-geist font-black text-4xl text-on-surface">{score}</p>
                    <p className="font-geist text-[10px] text-primary uppercase tracking-wider">This Week</p>
                  </div>
                  <div className="flex-1 text-center">
                    <p className={`font-geist font-bold text-2xl ${score > prevScore ? 'text-primary' : 'text-error'}`}>
                      {score > prevScore ? '+' : ''}{score - prevScore}
                    </p>
                    <p className="font-geist text-[10px] text-on-surface-variant uppercase">Change</p>
                  </div>
                  <div className="text-center">
                    <p className="font-geist font-black text-4xl text-on-surface-variant">{prevScore}</p>
                    <p className="font-geist text-[10px] text-on-surface-variant uppercase tracking-wider">Last Week</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <p className="font-hanken text-on-surface-variant text-sm">
                    Total emissions this week: <span className="text-on-surface font-medium">{formatEmissions(report.totalEmissionsKg)}</span>
                  </p>
                  <p className="font-hanken text-on-surface-variant text-sm mt-1">
                    Trend: <span className={`font-medium ${report.trend === 'improving' ? 'text-primary' : report.trend === 'worsening' ? 'text-error' : 'text-tertiary'}`}>
                      {report.trend.charAt(0).toUpperCase() + report.trend.slice(1)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Tactical objectives */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex justify-between items-center px-1">
                <h2 className="font-geist text-[11px] font-bold uppercase tracking-widest text-primary">Tactical Objectives</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.recommendations.slice(0, 4).map((rec, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleCommit(rec)}
                    className="w-full text-left bg-transparent block obsidian-card rounded-lg p-6 group hover:border-primary/20 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className={`font-geist text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter ${
                        rec.priority === 'high'
                          ? 'bg-primary text-on-primary'
                          : 'text-on-surface-variant bg-surface'
                      }`}>
                        {rec.priority} Impact
                      </span>
                    </div>
                    <h3 className="font-geist font-bold text-lg text-on-surface">{rec.title}</h3>
                    <p className="font-hanken text-on-surface-variant text-sm mt-2">{rec.description}</p>
                    <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                      <span className="font-geist text-[10px] text-on-surface-variant">
                        SAVE: -{formatEmissions(rec.potentialSavingsKg)}
                      </span>
                      <span className="text-primary font-geist font-bold text-xs">Commit →</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-white/5">
            <div className="flex gap-4">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-full font-geist text-xs font-bold hover:scale-105 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">share</span>
                Share Analysis
              </button>
              <button
                onClick={generateReport}
                disabled={isGenerating}
                className="flex items-center gap-2 border border-white/10 text-on-surface-variant px-6 py-2.5 rounded-full font-geist text-xs font-bold hover:bg-white/5 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">refresh</span>
                {isGenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>
            <div className="flex flex-col items-end opacity-30 hover:opacity-100 transition-opacity">
              <span className="font-geist text-[10px] font-bold tracking-[0.3em] uppercase">Intelligence Verified</span>
              <span className="font-geist text-[9px] mt-0.5 uppercase">Rootly Core v1.0.0</span>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-surface-container-highest/80 backdrop-blur-xl border border-primary/20 px-6 py-3 rounded-full shadow-2xl font-geist text-xs font-bold text-on-surface uppercase tracking-widest transition-all"
        >
          {toastMessage}
        </div>
      )}
    </div>
  )
}
