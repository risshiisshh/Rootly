'use client'

import { useState, useEffect, useCallback } from 'react'
import { auth, isFirebaseConfigured } from '@/services/firebase'
import { getUserActivities, createActivity, deleteActivity } from '@/services/firestore'
import { useAuthStore } from '@/store/userStore'
import { useActivityStore } from '@/store/activityStore'
import { GlassCard, DotGrid } from '@/components/glass/GlassCard'
import { EmissionBadge, KineticBar } from '@/components/shared/ScoreRing'
import { cn, formatRelativeTime, formatEmissions } from '@/lib/utils'
import { CATEGORY_ICONS, ROUTES } from '@/lib/constants'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { Timestamp } from 'firebase/firestore'
import {
  SkeletonPulse,
  SkeletonCard,
  SkeletonList,
  ErrorState,
  EmptyState,
} from '@/components/shared/StateFeedback'
import type { Activity, ActivityCategory, CreateActivityInput } from '@/types/activity'

const TEMPLATES = [
  { icon: 'commute', label: 'Commute (car, 10km)', category: 'transport' as const, activity: 'car', quantity: 10, emission: 1.92, description: 'Daily car commute' },
  { icon: 'restaurant', label: 'Red meat meal', category: 'food' as const, activity: 'red_meat', quantity: 1, emission: 3.2, description: 'Red meat-based meal' },
  { icon: 'bolt', label: 'Home office (4h)', category: 'energy' as const, activity: 'electricity', quantity: 4, emission: 0.93, description: 'Work from home electricity usage' },
  { icon: 'flight', label: 'Short-haul flight', category: 'transport' as const, activity: 'flight', quantity: 1000, emission: 255, description: 'Short flight < 1500km' },
]

const CATEGORY_TABS: { key: 'all' | ActivityCategory; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'transport', label: 'Travel', icon: 'commute' },
  { key: 'food', label: 'Food', icon: 'restaurant' },
  { key: 'energy', label: 'Energy', icon: 'bolt' },
  { key: 'lifestyle', label: 'Lifestyle', icon: 'home' },
]

export function ActivityClient() {
  const { userProfile } = useAuthStore()
  const { activities, weeklyEmissionsKg, setActivities, addActivity: addToStore, removeActivity: removeFromStore } = useActivityStore()
  const [activeTab, setActiveTab] = useState<'all' | ActivityCategory>('all')
  const [inputText, setInputText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [parseStatus, setParseStatus] = useState<'idle' | 'scanning' | 'done'>('idle')
  const [aiEstimate, setAiEstimate] = useState<number | null>(null)
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const isOnline = useOnlineStatus()

  const loadData = useCallback(async () => {
    if (!userProfile) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getUserActivities(userProfile.uid, { limit: 30 })
      setActivities(data)
    } catch (err) {
      console.error('Failed to load activities:', err)
      setError('Telemetry network connection lost. Could not load activity history.')
    } finally {
      setIsLoading(false)
    }
  }, [userProfile, setActivities])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Simulate real-time AI parsing while user types
  useEffect(() => {
    if (inputText.length < 5) {
      setParseStatus('idle')
      setAiEstimate(null)
      return
    }
    setParseStatus('scanning')
    const t = setTimeout(async () => {
      // Rough estimate based on keywords
      let est = 0
      if (/car|driv|drove/i.test(inputText)) est += 1.92 * 10
      if (/fly|flew|flight/i.test(inputText)) est += 255
      if (/meat|steak|burger/i.test(inputText)) est += 3.2
      if (/vegan|salad|vegetables/i.test(inputText)) est += 0.5
      if (/train|metro|subway/i.test(inputText)) est += 0.41
      setAiEstimate(est > 0 ? est : 0.8)
      setParseStatus('done')
    }, 800)
    return () => clearTimeout(t)
  }, [inputText])

  const logActivity = useCallback(async (input: CreateActivityInput) => {
    const activeUid = userProfile?.uid ?? 'demo-user-id'
    if (!isOnline) {
      // Offline mode: queue it in localStorage
      const tempId = `offline-${Date.now()}`
      const newAct: Activity = {
        id: tempId,
        userId: activeUid,
        timestamp: Timestamp.now(),
        createdAt: Timestamp.now(),
        ...input,
      }
      // Add to store so it appears in the list optimistically
      addToStore(newAct)
      
      // Save to offline queue in localStorage
      const queue = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('rootly_offline_queue') : null
      const items = queue ? JSON.parse(queue) : []
      items.push(input)
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('rootly_offline_queue', JSON.stringify(items))
      }
      return tempId
    } else {
      // Online mode: create in db
      const id = await createActivity(activeUid, input)
      addToStore({
        id,
        userId: activeUid,
        timestamp: Timestamp.now(),
        createdAt: Timestamp.now(),
        ...input,
      })
      return id
    }
  }, [userProfile, isOnline, addToStore])

  // Sync offline queue when coming online
  useEffect(() => {
    if (isOnline && userProfile) {
      const syncOfflineQueue = async () => {
        try {
          const queue = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('rootly_offline_queue') : null
          if (!queue) return
          const items: CreateActivityInput[] = JSON.parse(queue)
          if (items.length === 0) return

          setSyncMessage(`Syncing ${items.length} offline activities...`)

          // Sync each item to Firestore
          for (const item of items) {
            const id = await createActivity(userProfile.uid, item)
            addToStore({
              id,
              userId: userProfile.uid,
              timestamp: Timestamp.now(),
              createdAt: Timestamp.now(),
              ...item,
            })
          }
          // Clear queue
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem('rootly_offline_queue')
          }
          setSyncMessage('Offline activities successfully synchronized!')
          setTimeout(() => setSyncMessage(null), 3000)
          
          // Trigger reload
          loadData()
        } catch (err) {
          console.error('Failed to sync offline queue:', err)
          setSyncMessage('Failed to synchronize offline activities.')
          setTimeout(() => setSyncMessage(null), 4000)
        }
      }
      syncOfflineQueue()
    }
  }, [isOnline, userProfile, addToStore, loadData])

  const handleSubmitText = useCallback(async () => {
    if (!inputText.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      if (!isOnline) {
        // Offline: directly save with live estimate
        await logActivity({
          category: 'other',
          activity: 'general',
          quantity: 1,
          emission: aiEstimate ?? 1.0,
          description: `${inputText} (Logged Offline)`,
          source: 'manual',
        })
      } else {
        // Online: call AI backend
        let token = 'demo-token'
        if (isFirebaseConfigured && auth.currentUser) {
          try { token = await auth.currentUser.getIdToken() } catch { token = 'demo-token' }
        }
        const customKey = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? window.localStorage.getItem('user_gemini_api_key') : null
        const res = await fetch('/api/voice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(customKey ? { 'x-gemini-key': customKey } : {}),
          },
          body: JSON.stringify({ transcript: inputText }),
        })
        
        if (!res.ok) {
          throw new Error('API failed')
        }

        const data = await res.json()

        if (data.activities?.length > 0) {
          for (const a of data.activities) {
            await logActivity({
              category: a.category,
              activity: a.activity,
              quantity: a.quantity,
              emission: a.emission,
              description: a.description,
              source: 'manual',
            })
          }
        } else {
          // Fallback — log as generic lifestyle entry
          await logActivity({
            category: 'other',
            activity: 'general',
            quantity: 1,
            emission: aiEstimate ?? 1.0,
            description: inputText,
            source: 'manual',
          })
        }
      }
      setInputText('')
      setParseStatus('idle')
      setAiEstimate(null)
    } catch (err) {
      console.error('Failed to log activity, falling back to manual log:', err)
      await logActivity({
        category: 'other',
        activity: 'general',
        quantity: 1,
        emission: aiEstimate ?? 1.0,
        description: inputText,
        source: 'manual',
      })
      setInputText('')
      setParseStatus('idle')
      setAiEstimate(null)
    } finally {
      setIsSubmitting(false)
    }
  }, [inputText, isOnline, isSubmitting, aiEstimate, logActivity])

  const handleDeleteActivity = async (id: string) => {
    await deleteActivity(id).catch(console.error)
    removeFromStore(id)
  }

  const filteredActivities = activities.filter(
    (a) => activeTab === 'all' || a.category === activeTab
  )

  const categoryBreakdown = (['transport', 'food', 'energy', 'lifestyle', 'other'] as ActivityCategory[]).map((cat) => ({
    category: cat,
    kg: activities.filter((a) => a.category === cat).reduce((s, a) => s + a.emission, 0),
  })).sort((a, b) => b.kg - a.kg)

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

  return (
    <div className="relative min-h-screen px-4 md:px-16 py-8 max-w-7xl mx-auto">
      <DotGrid className="opacity-40" />

      {/* Offline sync indicators */}
      {!isOnline && (
        <div className="relative z-10 mb-6 bg-error-container/10 border border-error/30 p-4 rounded-xl flex items-center justify-between text-error font-hanken text-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">cloud_off</span>
            <span>Logging is active in offline mode. Activities will be synced when online.</span>
          </div>
          <span className="font-geist text-[10px] uppercase font-bold tracking-wider opacity-60">OFFLINE_ACTIVE</span>
        </div>
      )}

      {syncMessage && (
        <div className="relative z-10 mb-6 bg-primary-container/10 border border-primary/30 p-4 rounded-xl flex items-center justify-between text-primary font-hanken text-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
            <span>{syncMessage}</span>
          </div>
          <span className="font-geist text-[10px] uppercase font-bold tracking-wider opacity-60">SYNCING</span>
        </div>
      )}

      {/* Header */}
      <div className="relative z-10 mb-8">
        <p className="font-geist text-[11px] text-primary uppercase tracking-widest mb-1">
          Footprint Intelligence // Activity Log
        </p>
        <h1 className="font-geist font-bold text-on-surface text-4xl md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
          Activity <span className="text-primary">Intelligence</span>
        </h1>
        <p className="font-hanken text-on-surface-variant mt-2">
          Monitor and manage your environmental footprint in real-time.
        </p>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Input panel */}
        <div className="md:col-span-5 space-y-4">
          <GlassCard className="p-8 space-y-6" hover={false}>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: '"FILL" 1' }} aria-hidden="true">psychology</span>
              <h2 className="font-geist font-semibold text-on-surface">Input Module</h2>
            </div>
            <p className="font-hanken text-on-surface-variant text-sm">
              What&apos;s your footprint today? Describe an activity or use a quick template.
            </p>

            {/* Templates */}
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => {
                    logActivity({
                      category: t.category,
                      activity: t.activity,
                      quantity: t.quantity,
                      emission: t.emission,
                      description: t.description,
                      source: 'manual',
                    })
                  }}
                  className="flex items-center gap-2 p-3 bg-surface-container rounded-xl border border-outline-variant/30 hover:border-primary/30 hover:bg-primary-container/10 transition-all text-left"
                >
                  <span className="material-symbols-outlined text-on-primary-container text-[18px]" aria-hidden="true">{t.icon}</span>
                  <span className="font-geist text-on-surface text-sm leading-tight">{t.label.split(' (')[0]}</span>
                </button>
              ))}
            </div>

            {/* Text input */}
            <div className="relative">
              <label htmlFor="activity-input" className="font-geist text-[11px] text-primary uppercase tracking-widest block mb-2">
                Describe Activity
              </label>
              <textarea
                id="activity-input"
                className="recessed-input w-full p-4 rounded-xl font-hanken text-on-surface text-sm resize-none placeholder:text-on-surface-variant/40"
                placeholder="E.g., I flew from London to Paris and had a vegan dinner..."
                rows={4}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <button
                onClick={handleSubmitText}
                disabled={!inputText.trim() || isSubmitting}
                className="absolute bottom-4 right-4 bg-primary text-on-primary p-2.5 rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Submit activity"
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin block" aria-hidden="true" />
                ) : (
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">send</span>
                )}
              </button>
            </div>

            {/* Live parsing indicator */}
            {parseStatus !== 'idle' && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-secondary-container/20 border border-secondary/20 rounded-full">
                <div className="flex items-center gap-2">
                  {parseStatus === 'scanning' ? (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" aria-hidden="true" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }} aria-hidden="true">check_circle</span>
                  )}
                  <span className="font-geist text-[11px] text-primary uppercase tracking-wider" role="status" aria-live="polite">
                    {parseStatus === 'scanning' ? 'Scanning Text...' : 'Analysis Ready'}
                  </span>
                </div>
                {aiEstimate !== null && parseStatus === 'done' && (
                  <span className="font-geist font-bold text-primary text-sm">~{formatEmissions(aiEstimate)}</span>
                )}
              </div>
            )}
          </GlassCard>

          {/* AI Intelligence Card */}
          {aiEstimate !== null && parseStatus === 'done' && (
            <GlassCard variant="primary" className="p-6 space-y-4" hover={false}>
              <div className="flex items-center justify-between">
                <h3 className="font-geist font-medium text-on-surface">AI Intelligence</h3>
                <span className="font-geist text-[10px] text-primary uppercase tracking-wider">Live Analysis</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-geist text-sm text-on-surface-variant">Current Estimate</span>
                <span className="font-geist font-bold text-primary">{formatEmissions(aiEstimate)} CO₂e</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-surface-container-high rounded-xl border border-white/5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="material-symbols-outlined text-primary text-[16px]" aria-hidden="true">trending_down</span>
                    <span className="font-geist text-[11px] text-on-surface-variant uppercase">Potential Savings</span>
                  </div>
                  <p className="font-geist font-bold text-primary text-lg">-{formatEmissions(aiEstimate * 0.2)}</p>
                  <p className="font-hanken text-on-surface-variant text-xs">If offset via alternatives</p>
                </div>
                <div className="p-3 bg-surface-container-high rounded-xl border border-white/5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="material-symbols-outlined text-tertiary text-[16px]" aria-hidden="true">lightbulb</span>
                    <span className="font-geist text-[11px] text-on-surface-variant uppercase">Suggestion</span>
                  </div>
                  <p className="font-hanken text-on-surface text-xs leading-relaxed">Consider lower-impact alternatives</p>
                </div>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Activity history */}
        <div className="md:col-span-7 space-y-6">
          {/* Category breakdown */}
          <GlassCard className="p-6 space-y-4">
            <h2 className="font-geist font-semibold text-on-surface">Category Breakdown</h2>
            {isLoading ? (
              <div className="space-y-3">
                <SkeletonPulse className="h-4 w-full rounded" />
                <SkeletonPulse className="h-4 w-5/6 rounded" />
                <SkeletonPulse className="h-4 w-2/3 rounded" />
              </div>
            ) : categoryBreakdown.filter(c => c.kg > 0).map((cat) => (
              <KineticBar
                key={cat.category}
                value={weeklyEmissionsKg > 0 ? (cat.kg / weeklyEmissionsKg) * 100 : 0}
                label={cat.category}
                showValue={true}
              />
            ))}
            {!isLoading && categoryBreakdown.every(c => c.kg === 0) && (
              <p className="font-hanken text-on-surface-variant text-sm text-center py-4">Log activities to see your breakdown</p>
            )}
          </GlassCard>

          {/* Activity table */}
          <GlassCard className="p-6" hover={false}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h2 className="font-geist font-semibold text-on-surface">Activity History</h2>
              <div className="flex gap-2">
                {(['daily', 'weekly', 'monthly'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeFilter(t)}
                    className={cn(
                      'px-3 py-1.5 rounded-full font-geist text-sm capitalize transition-colors',
                      timeFilter === t
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high border border-white/5'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Category filter tabs */}
            <div className="flex gap-2 flex-wrap mb-4" aria-label="Filter by category">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.key}
                  aria-pressed={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full font-geist text-[12px] transition-all',
                    activeTab === tab.key
                      ? 'bg-primary-container/40 text-primary border border-primary/30'
                      : 'text-on-surface-variant border border-transparent hover:border-outline-variant/30'
                  )}
                >
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <SkeletonList count={5} />
            ) : filteredActivities.length === 0 ? (
              <EmptyState
                icon="list_alt"
                title={`No ${activeTab === 'all' ? '' : activeTab} activities logged`}
                description="Your operational telemetry log is clean. Let's record some metrics to verify your weekly carbon budget."
                steps={[
                  { icon: 'bolt', title: 'Quick Templates', description: 'Log a daily commute, beef meal, or WFH energy usage.' },
                  { icon: 'edit_note', title: 'Manual Entry', description: 'Describe your activity (e.g. "Drove 10km in SUV").' },
                  { icon: 'mic', title: 'Voice Session', description: 'Record a voice description in the Voice tab.' }
                ]}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" aria-label="Activity history">
                  <thead>
                    <tr className="border-b border-outline-variant/10 text-on-surface-variant font-geist text-[11px] uppercase tracking-wider">
                      <th scope="col" className="pb-3 text-left font-normal">Activity</th>
                      <th scope="col" className="pb-3 text-left font-normal hidden md:table-cell">Date</th>
                      <th scope="col" className="pb-3 text-left font-normal">Category</th>
                      <th scope="col" className="pb-3 text-left font-normal">Emissions</th>
                      <th scope="col" className="pb-3 text-right font-normal"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="font-hanken">
                    {filteredActivities.slice(0, 20).map((activity) => (
                      <tr
                        key={activity.id}
                        className="border-b border-outline-variant/10 hover:bg-white/5 transition-colors group"
                      >
                        <td className="py-3 font-medium text-on-surface text-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span>{activity.description || activity.activity}</span>
                            {activity.id.startsWith('offline-') && (
                              <span className="w-fit px-1.5 py-0.5 bg-error/10 text-error rounded text-[9px] font-geist font-bold uppercase tracking-wider">
                                Pending Sync
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-on-surface-variant text-sm hidden md:table-cell">
                          {activity.timestamp?.toDate ? formatRelativeTime(activity.timestamp.toDate()) : 'Recent'}
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-geist capitalize">
                            {activity.category}
                          </span>
                        </td>
                        <td className="py-3">
                          <EmissionBadge kg={activity.emission} size="sm" />
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleDeleteActivity(activity.id)}
                            className="material-symbols-outlined text-on-surface-variant text-[18px] opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-error transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 focus-visible:rounded"
                            aria-label={`Delete activity: ${activity.description || activity.activity}`}
                          >
                            delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
