'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/userStore'
import { useActivityStore } from '@/store/activityStore'
import { GlassCard, DotGrid } from '@/components/glass/GlassCard'
import { ScoreRing } from '@/components/shared/ScoreRing'
import { formatEmissions } from '@/lib/utils'

export function ProfileClient() {
  const { userProfile, firebaseUser: user } = useAuthStore()
  const { activities, weeklyEmissionsKg } = useActivityStore()
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview')
  const [weeklyGoal, setWeeklyGoal] = useState(userProfile?.weeklyGoalKg ?? 100)
  const [displayName, setDisplayName] = useState(userProfile?.displayName ?? user?.displayName ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const score = userProfile?.carbonScore ?? 75
  const totalEmissions = activities.reduce((s, a) => s + a.emission, 0)
  const totalActivities = activities.length

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSaved(false)
    try {
      // In production: update Firestore user document
      await new Promise((r) => setTimeout(r, 600))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save settings:', err)
      setError('Failed to save settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const tier = score >= 90 ? 'System Architect'
    : score >= 75 ? 'Climate Operator'
    : score >= 60 ? 'Carbon Scout'
    : score >= 40 ? 'Baseline Analyst'
    : 'Recruit'

  const level = Math.floor(score / 10) + 1

  return (
    <div className="relative min-h-screen px-4 md:px-16 py-8 max-w-5xl mx-auto">
      <DotGrid className="opacity-40" />

      <header className="relative z-10 mb-8">
        <p className="font-geist text-[11px] text-primary uppercase tracking-widest mb-1">Operator Profile // Intelligence Briefing</p>
        <h1 className="font-geist font-bold text-on-surface text-4xl md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
          Profile <span className="text-primary">Intelligence</span>
        </h1>
      </header>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile card */}
        <div className="lg:col-span-4 space-y-5">
          <GlassCard className="p-8 flex flex-col items-center text-center" hover={false}>
            {/* Avatar */}
            <div className="relative mb-5">
              <div className="w-24 h-24 rounded-full bg-primary-container flex items-center justify-center text-3xl font-geist font-black text-primary">
                {(displayName || user?.email || 'U')[0].toUpperCase()}
              </div>
              <div className="absolute inset-0 border-2 border-primary rounded-full animate-pulse" aria-hidden="true" />
            </div>

            <h2 className="font-geist font-bold text-on-surface text-xl">{displayName || user?.displayName || 'Operator'}</h2>
            <p className="font-geist text-[11px] text-primary uppercase tracking-widest mt-1">Lvl {level} — {tier}</p>
            <p className="font-hanken text-on-surface-variant text-sm mt-1">{user?.email}</p>

            <div className="mt-6 w-full">
              <ScoreRing score={score} size={140} label="Carbon Score" sublabel={tier} animated />
            </div>

            {/* XP bar */}
            <div className="w-full mt-5">
              <div className="flex justify-between mb-1.5">
                <span className="font-geist text-[10px] text-on-surface-variant uppercase">Level Progress</span>
                <span className="font-geist text-[10px] text-primary">{score % 10 * 10}%</span>
              </div>
              <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(score % 10) * 10}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
          </GlassCard>

          {/* Stats */}
          <GlassCard className="p-6 space-y-4">
            <h3 className="font-geist text-[11px] text-outline uppercase tracking-widest">Operator Stats</h3>
            {[
              { label: 'Total Emissions', value: formatEmissions(totalEmissions), icon: 'eco' },
              { label: 'Activities Logged', value: String(totalActivities), icon: 'list_alt' },
              { label: 'Weekly Target', value: `${weeklyGoal} kg`, icon: 'flag' },
              { label: 'This Week', value: formatEmissions(weeklyEmissionsKg), icon: 'calendar_today' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between py-2 border-b border-outline-variant/10 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant text-[16px]" aria-hidden="true">{s.icon}</span>
                  <span className="font-geist text-sm text-on-surface-variant">{s.label}</span>
                </div>
                <span className="font-geist font-bold text-on-surface text-sm">{s.value}</span>
              </div>
            ))}
          </GlassCard>
        </div>

        {/* Main content */}
        <div className="lg:col-span-8 space-y-5">
          {/* Tab toggle */}
          <div className="flex gap-2">
            {(['overview', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-full font-geist text-sm capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-primary text-on-primary font-bold'
                    : 'bg-surface-container text-on-surface-variant border border-white/5 hover:border-outline-variant/30'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'overview' ? (
            <div className="space-y-5">
              {/* Achievements */}
              <GlassCard className="p-8" hover={false}>
                <h2 className="font-geist font-bold text-on-surface text-xl mb-6">Achievements</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { icon: 'eco', title: 'First Log', desc: 'Logged your first activity', earned: totalActivities > 0 },
                    { icon: 'mic', title: 'Voice Pioneer', desc: 'Used voice logging', earned: false },
                    { icon: 'route', title: 'Green Route', desc: 'Compared routes once', earned: false },
                    { icon: 'flag', title: 'Mission Set', desc: 'Created a goal', earned: false },
                    { icon: 'auto_awesome', title: 'AI Conversation', desc: 'Chatted with AI coach', earned: false },
                    { icon: 'analytics', title: 'Report Generated', desc: 'Generated weekly report', earned: false },
                  ].map((a) => (
                    <div
                      key={a.title}
                      className={`p-4 rounded-xl border text-center ${
                        a.earned
                          ? 'bg-primary-container/20 border-primary/30'
                          : 'bg-surface-container border-outline-variant/10 opacity-50'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-3xl mb-2 block ${a.earned ? 'text-primary' : 'text-on-surface-variant'}`}
                        style={{ fontVariationSettings: '"FILL" 1' }}
                        aria-hidden="true"
                      >{a.icon}</span>
                      <p className="font-geist font-bold text-on-surface text-sm">{a.title}</p>
                      <p className="font-hanken text-on-surface-variant text-xs mt-0.5">{a.desc}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Activity heatmap — simplified grid */}
              <GlassCard className="p-8" hover={false}>
                <h2 className="font-geist font-bold text-on-surface text-xl mb-5">90-Day Activity Heatmap</h2>
                <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(13, 1fr)' }} aria-hidden="true">
                  {Array.from({ length: 91 }, (_, i) => {
                    const d = new Date()
                    d.setDate(d.getDate() - (90 - i))
                    const dayActivities = activities.filter((a) => {
                      const ad = a.timestamp?.toDate?.()
                      return ad && ad.toDateString() === d.toDateString()
                    })
                    const intensity = dayActivities.length === 0 ? 0
                      : dayActivities.length === 1 ? 1
                      : dayActivities.length <= 3 ? 2
                      : 3
                    return (
                      <div
                        key={i}
                        className={`h-3 rounded-sm border border-white/5 ${
                          intensity === 0 ? 'bg-surface-container-highest'
                          : intensity === 1 ? 'bg-primary/20'
                          : intensity === 2 ? 'bg-primary/50'
                          : 'bg-primary'
                        }`}
                        title={`${d.toLocaleDateString()}: ${dayActivities.length} activities`}
                      />
                    )
                  })}
                </div>
                <div className="flex items-center gap-2 mt-3 justify-end">
                  <span className="font-geist text-[10px] text-on-surface-variant">Less</span>
                  {[0, 1, 2, 3].map((l) => (
                    <div key={l} className={`w-3 h-3 rounded-sm ${
                      l === 0 ? 'bg-surface-container-highest'
                      : l === 1 ? 'bg-primary/20'
                      : l === 2 ? 'bg-primary/50'
                      : 'bg-primary'
                    }`} aria-hidden="true" />
                  ))}
                  <span className="font-geist text-[10px] text-on-surface-variant">More</span>
                </div>
              </GlassCard>
            </div>
          ) : (
            /* Settings */
            <GlassCard className="p-8 space-y-6" hover={false}>
              <h2 className="font-geist font-bold text-on-surface text-xl">Account Settings</h2>

              <div>
                <label htmlFor="profile-name" className="font-geist text-[11px] text-primary uppercase tracking-widest block mb-1.5">Display Name</label>
                <input
                  id="profile-name"
                  className="recessed-input w-full px-4 py-3 rounded-xl font-hanken text-on-surface text-sm"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="weekly-goal" className="font-geist text-[11px] text-primary uppercase tracking-widest block mb-1.5">
                  Weekly Carbon Goal: {weeklyGoal} kg CO₂
                </label>
                <input
                  id="weekly-goal"
                  type="range"
                  min={10}
                  max={500}
                  step={5}
                  className="w-full accent-primary"
                  value={weeklyGoal}
                  onChange={(e) => setWeeklyGoal(Number(e.target.value))}
                  aria-label="Weekly carbon target goal in kilograms of CO2"
                  aria-valuemin={10}
                  aria-valuemax={500}
                  aria-valuenow={weeklyGoal}
                  aria-valuetext={`${weeklyGoal} kg of CO2`}
                />
                <div className="flex justify-between font-geist text-[10px] text-on-surface-variant mt-1">
                  <span>10 kg (Excellent)</span>
                  <span>500 kg (Baseline)</span>
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-error-container/10 border border-error/20 flex items-start gap-2.5" role="alert">
                  <span className="material-symbols-outlined text-error text-[18px] shrink-0" aria-hidden="true">error</span>
                  <p className="font-hanken text-error text-xs">{error}</p>
                </div>
              )}

              <div className="pt-2 border-t border-outline-variant/10">
                <p className="font-geist text-[11px] text-on-surface-variant uppercase tracking-widest mb-2">Danger Zone</p>
                <button className="text-error font-geist text-sm border border-error/30 px-4 py-2 rounded-full hover:bg-error-container/20 transition-colors">
                  Delete All Data
                </button>
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-3 rounded-full bg-primary text-on-primary font-geist font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" aria-hidden="true" />
                    Saving...
                  </>
                ) : saved ? (
                  '✓ Saved Successfully'
                ) : (
                  'Save Settings'
                )}
              </button>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  )
}
