'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getUserGoals, createGoal, updateGoal, deleteGoal } from '@/services/firestore'
import { useAuthStore } from '@/store/userStore'
import { GlassCard, DotGrid } from '@/components/glass/GlassCard'
import { cn, formatEmissions, formatRelativeTime } from '@/lib/utils'
import type { Goal } from '@/types/report'
import { Timestamp } from 'firebase/firestore'
import { ErrorState, EmptyState, SkeletonCard } from '@/components/shared/StateFeedback'


/* ─── Habit grid (30-day dot matrix from Stitch design) ─── */
function HabitGrid({ completionRate }: { completionRate: number }) {
  const dots = Array.from({ length: 30 }, (_, i) => {
    // Simulate realistic streak pattern
    const seed = (i * 13 + 7) % 100
    return seed < completionRate
  })
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(30, 1fr)' }} aria-hidden="true">
      {dots.map((filled, i) => (
        <div
          key={i}
          className={cn(
            'h-3 w-full rounded-sm border border-white/5 transition-colors',
            filled ? 'bg-primary/50' : 'bg-surface-container-highest'
          )}
        />
      ))}
    </div>
  )
}

/* ─── Circular progress (matches Stitch conic gradient) ─── */
function CircularProgress({ value, size = 100 }: { value: number; size?: number }) {
  const deg = (value / 100) * 360
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2} cy={size / 2} r={size / 2 - 8}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={size / 2 - 8}
          fill="none" stroke="#91d883" strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * (size / 2 - 8)}`}
          strokeDashoffset={2 * Math.PI * (size / 2 - 8) * (1 - value / 100)}
          initial={{ strokeDashoffset: 2 * Math.PI * (size / 2 - 8) }}
          animate={{ strokeDashoffset: 2 * Math.PI * (size / 2 - 8) * (1 - value / 100) }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-geist font-bold text-primary" style={{ fontSize: size * 0.22 }}>
          {value}%
        </span>
      </div>
    </div>
  )
}

/* ─── Create Goal Modal ─── */
function CreateGoalModal({ onClose, onCreate }: { onClose: () => void; onCreate: (goal: Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void> }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('transport')
  const [targetKg, setTargetKg] = useState(20)
  const [deadline, setDeadline] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    const handleClose = () => {
      onClose()
    }
    dialog.addEventListener('close', handleClose)
    return () => {
      dialog.removeEventListener('close', handleClose)
    }
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onCreate({
        title,
        description,
        category,
        targetReductionKg: targetKg,
        currentProgressKg: 0,
        deadline: deadline ? Timestamp.fromDate(new Date(deadline)) : Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        status: 'active',
      })
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="bg-transparent border-0 p-0 outline-none max-w-lg w-full z-50 backdrop:bg-background/80 backdrop:backdrop-blur-md"
      aria-labelledby="create-goal-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2 }}
        className="glass-card rounded-2xl p-8 w-full"
      >
        <h2 id="create-goal-title" className="font-geist font-bold text-on-surface text-2xl mb-6">New Mission Objective</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="goal-title" className="font-geist text-[11px] text-primary uppercase tracking-widest block mb-1.5">Mission Name</label>
            <input
              id="goal-title"
              className="recessed-input w-full px-4 py-3 rounded-xl font-hanken text-on-surface text-sm"
              placeholder="e.g. Zero-Emission Commute"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="goal-desc" className="font-geist text-[11px] text-primary uppercase tracking-widest block mb-1.5">Description</label>
            <textarea
              id="goal-desc"
              className="recessed-input w-full px-4 py-3 rounded-xl font-hanken text-on-surface text-sm resize-none"
              rows={2}
              placeholder="Describe your mission..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="goal-category" className="font-geist text-[11px] text-primary uppercase tracking-widest block mb-1.5">Category</label>
              <select
                id="goal-category"
                className="recessed-input w-full px-4 py-3 rounded-xl font-hanken text-on-surface text-sm bg-surface-container-low"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {['transport', 'food', 'energy', 'lifestyle', 'other'].map((c) => (
                  <option key={c} value={c} className="bg-surface-container capitalize">{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="goal-target" className="font-geist text-[11px] text-primary uppercase tracking-widest block mb-1.5">Target (kg CO₂)</label>
              <input
                id="goal-target"
                type="number"
                min={1}
                max={10000}
                className="recessed-input w-full px-4 py-3 rounded-xl font-hanken text-on-surface text-sm"
                value={targetKg}
                onChange={(e) => setTargetKg(Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <label htmlFor="goal-deadline" className="font-geist text-[11px] text-primary uppercase tracking-widest block mb-1.5">Deadline</label>
            <input
              id="goal-deadline"
              type="date"
              className="recessed-input w-full px-4 py-3 rounded-xl font-hanken text-on-surface text-sm"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-full border border-outline-variant/30 font-geist text-sm text-on-surface-variant hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="flex-1 py-3 rounded-full bg-primary text-on-primary font-geist font-bold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Commence Mission'}
            </button>
          </div>
        </form>
      </motion.div>
    </dialog>
  )
}

/* ─── Goal Mission Card ─── */
function GoalCard({ goal, onDelete, onStatusChange }: { goal: Goal; onDelete: (id: string) => void; onStatusChange: (id: string, status: Goal['status']) => void }) {
  const progress = goal.targetReductionKg > 0
    ? Math.min(100, Math.round((goal.currentProgressKg / goal.targetReductionKg) * 100))
    : 0

  const daysLeft = goal.deadline?.toDate
    ? Math.ceil((goal.deadline.toDate().getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-card p-8 rounded-xl flex items-center justify-between group overflow-hidden relative hover:border-primary/20 transition-colors"
    >
      {/* Decorative glow */}
      <div className="absolute -right-16 -top-16 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors pointer-events-none" aria-hidden="true" />

      <div className="z-10 flex-1 min-w-0 pr-6">
        <span className="font-geist text-[10px] text-primary mb-2 block tracking-widest uppercase">
          {goal.status === 'active' ? '● ACTIVE MISSION' : goal.status === 'completed' ? '✓ COMPLETED' : '⏸ PAUSED'}
        </span>
        <h3 className="font-geist font-bold text-on-surface text-xl mb-3 leading-tight">{goal.title}</h3>
        {goal.description && (
          <p className="font-hanken text-on-surface-variant text-sm mb-3 line-clamp-2">{goal.description}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="font-geist text-[11px] text-on-surface-variant uppercase tracking-tight">
            {formatEmissions(goal.currentProgressKg)} / {formatEmissions(goal.targetReductionKg)}
          </span>
          {daysLeft !== null && (
            <span className={cn('font-geist text-[11px] uppercase tracking-tight', daysLeft < 7 ? 'text-error' : 'text-on-surface-variant')}>
              {daysLeft > 0 ? `${daysLeft}d remaining` : 'Overdue'}
            </span>
          )}
          <span className="font-geist text-[11px] text-on-surface-variant uppercase capitalize">{goal.category}</span>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-3">
        <CircularProgress value={progress} size={88} />
        <div className="flex gap-2">
          {goal.status === 'active' && (
            <button
              onClick={() => onStatusChange(goal.id, 'paused')}
              className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-surface-container-highest transition-colors"
              aria-label="Pause mission"
            >
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant" aria-hidden="true">pause</span>
            </button>
          )}
          {goal.status === 'paused' && (
            <button
              onClick={() => onStatusChange(goal.id, 'active')}
              className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-surface-container-highest transition-colors"
              aria-label="Resume mission"
            >
              <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">play_arrow</span>
            </button>
          )}
          <button
            onClick={() => onDelete(goal.id)}
            className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-error-container/30 hover:text-error transition-colors"
            aria-label={`Delete mission: ${goal.title}`}
          >
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant" aria-hidden="true">delete</span>
          </button>
        </div>
      </div>
    </motion.div>
  )
}

const CHALLENGES = [
  { icon: 'speed', title: 'The 2km Protocol', description: 'Convert all trips under 2km to kinetic mobility.', reward: '+4.2kg CO₂ saved', type: 'weekly' },
  { icon: 'wb_sunny', title: 'Solar Harvest', description: 'Maximize daytime appliance usage via peak solar alignment.', reward: '+120kWh projected', type: 'monthly' },
  { icon: 'eco', title: 'Plant-Based Week', description: 'Eliminate animal products for 7 consecutive days.', reward: '+21kg CO₂ saved', type: 'weekly' },
]

const HABITS = [
  { label: 'Plant-Based Diet', completion: 86 },
  { label: 'Public Transit', completion: 92 },
  { label: 'Zero Waste', completion: 54 },
]

const DEMO_USER_ID = 'demo-user-id'

export function GoalsClient() {
  const { userProfile } = useAuthStore()
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | Goal['status']>('all')
  const [error, setError] = useState<string | null>(null)

  const uid = userProfile?.uid ?? DEMO_USER_ID

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getUserGoals(uid)
      setGoals(data)
    } catch (err) {
      console.error('Failed to load goals:', err)
      setError('Could not download active goals from the cloud database.')
    } finally {
      setIsLoading(false)
    }
  }, [uid])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreate = useCallback(async (data: Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const id = await createGoal(uid, data)
    const newGoal: Goal = {
      id,
      userId: uid,
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }
    setGoals((prev) => [newGoal, ...prev])
  }, [userProfile])

  const handleDelete = useCallback(async (id: string) => {
    await deleteGoal(id).catch(console.error)
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }, [])

  const handleStatusChange = useCallback(async (id: string, status: Goal['status']) => {
    await updateGoal(id, { status }).catch(console.error)
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, status } : g))
  }, [])

  const filteredGoals = goals.filter((g) => activeFilter === 'all' || g.status === activeFilter)
  const activeGoals = goals.filter((g) => g.status === 'active')
  const completedGoals = goals.filter((g) => g.status === 'completed')

  return (
    <div className="relative min-h-screen px-4 md:px-16 py-8 max-w-7xl mx-auto">
      <DotGrid className="opacity-40" />

      {/* Header */}
      <header className="relative z-10 mb-10">
        <p className="font-geist text-[11px] text-primary uppercase tracking-widest mb-1">Mission Objectives // Performance Lab</p>
        <h1 className="font-geist font-bold text-on-surface text-4xl md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
          Goals &amp; <span className="text-primary">Challenges</span>
        </h1>
        <p className="font-hanken text-on-surface-variant mt-2 max-w-xl">
          High-fidelity tracking for planetary resilience. Performance telemetry for the carbon-conscious operator.
        </p>
      </header>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Habit tracking grid from Stitch */}
          <GlassCard className="p-8" hover={false}>
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="font-geist font-bold text-on-surface text-2xl mb-1">Stability Vectors</h2>
                <p className="font-geist text-[11px] text-on-surface-variant uppercase tracking-widest">30-Day Operational Log</p>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-on-surface-variant font-geist uppercase">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary/50" aria-hidden="true" />
                  Validated
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-surface-container-highest" aria-hidden="true" />
                  Null
                </div>
              </div>
            </div>
            <div className="space-y-6">
              {HABITS.map((habit) => (
                <div key={habit.label} className="space-y-2">
                  <div className="flex justify-between items-center font-geist text-sm">
                    <span className="text-on-surface">{habit.label}</span>
                    <span className={habit.completion >= 80 ? 'text-primary' : 'text-secondary'}>
                      {habit.completion}% Efficiency
                    </span>
                  </div>
                  <HabitGrid completionRate={habit.completion} />
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Goals list */}
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div className="flex gap-2" role="tablist" aria-label="Filter goals">
                {(['all', 'active', 'completed', 'paused'] as const).map((f) => (
                  <button
                    key={f}
                    role="tab"
                    aria-selected={activeFilter === f}
                    onClick={() => setActiveFilter(f)}
                    className={cn(
                      'px-3 py-1.5 rounded-full font-geist text-[12px] capitalize transition-all',
                      activeFilter === f
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface-variant border border-white/5 hover:border-outline-variant/30'
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full font-geist font-bold text-sm hover:opacity-90 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
                New Mission
              </button>
            </div>

            {error ? (
              <ErrorState
                title="Failed to Load Missions"
                message={error}
                onRetry={loadData}
                retryLabel="Retry Connection"
              />
            ) : isLoading ? (
              <div className="space-y-4">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : filteredGoals.length === 0 ? (
              <EmptyState
                icon="flag"
                title={`No ${activeFilter === 'all' ? '' : activeFilter} missions active`}
                description="Missions represent concrete reduction targets. Commit to a challenge below or set a custom mission objective."
                steps={[
                  { icon: 'add', title: 'New Mission', description: 'Create a custom reduction goal with a specific category and deadline.' },
                  { icon: 'bolt', title: 'Critical Challenges', description: 'Choose from pre-set carbon optimization protocols below.' },
                  { icon: 'trending_up', title: 'Track Efficiency', description: 'Log activities to automatically drive down goal balances.' }
                ]}
                action={{
                  label: "Commence Custom Mission",
                  onClick: () => setShowCreate(true),
                  icon: "add"
                }}
              />
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-4">
                  {filteredGoals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} onDelete={handleDelete} onStatusChange={handleStatusChange} />
                  ))}
                </div>
              </AnimatePresence>
            )}
          </div>

          {/* Challenges */}
          <div>
            <h2 className="font-geist font-bold text-on-surface text-2xl mb-4">Critical Challenges</h2>
            <div className="space-y-3">
              {CHALLENGES.map((challenge) => (
                <div
                  key={challenge.title}
                  className="glass-card p-1 rounded-full pr-6 flex items-center gap-5 group hover:border-primary/30 transition-all duration-300"
                >
                  <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: '"FILL" 1' }} aria-hidden="true">{challenge.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                      <h4 className="font-geist font-bold text-on-surface">{challenge.title}</h4>
                      <span className="font-geist text-[11px] text-primary uppercase tracking-tight shrink-0">{challenge.reward}</span>
                    </div>
                    <p className="font-hanken text-on-surface-variant text-sm">{challenge.description}</p>
                  </div>
                  <button
                    onClick={async () => {
                      const categoryMap: Record<string, string> = {
                        speed: 'transport',
                        wb_sunny: 'energy',
                        eco: 'food'
                      }
                      const targetMap: Record<string, number> = {
                        'The 2km Protocol': 4.2,
                        'Solar Harvest': 15.0,
                        'Plant-Based Week': 21.0
                      }
                      const durationDays = challenge.type === 'monthly' ? 30 : 7

                      await handleCreate({
                        title: challenge.title,
                        description: challenge.description,
                        category: categoryMap[challenge.icon] ?? 'other',
                        targetReductionKg: targetMap[challenge.title] ?? 10.0,
                        currentProgressKg: 0,
                        deadline: Timestamp.fromDate(new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)),
                        status: 'active'
                      })
                    }}
                    className="shrink-0 bg-primary text-on-primary px-5 py-2 rounded-full font-geist text-sm font-bold hover:opacity-90 active:scale-95 transition-all hidden sm:block"
                  >
                    Commence
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-5">
          {/* Stats */}
          <GlassCard className="p-6 space-y-5">
            <h3 className="font-geist text-[11px] text-outline uppercase tracking-widest">Mission Status</h3>
            {[
              { label: 'Active Missions', value: activeGoals.length, icon: 'flag' },
              { label: 'Completed', value: completedGoals.length, icon: 'check_circle' },
              { label: 'Total Reduction', value: `${goals.reduce((s, g) => s + g.currentProgressKg, 0).toFixed(1)} kg`, icon: 'eco' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 pb-4 border-b border-outline-variant/10 last:border-0 last:pb-0">
                <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }} aria-hidden="true">{stat.icon}</span>
                </div>
                <div>
                  <p className="font-geist font-bold text-on-surface text-lg leading-none">{stat.value}</p>
                  <p className="font-geist text-on-surface-variant text-xs mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </GlassCard>

          {/* Milestones */}
          <GlassCard className="p-6">
            <h3 className="font-geist text-[11px] text-outline uppercase tracking-widest mb-5">Verified Milestones</h3>
            <div className="space-y-4">
              {[
                { title: '14kg CO₂ Sequestered', time: '4h 22m ago', active: true },
                { title: 'Grid Autonomy Reached', time: '12h 45m ago', active: false },
                { title: 'Mobility Shift Complete', time: '28h ago', active: false },
                { title: 'Plant-Based Streak: 7d', time: '3d ago', active: false },
              ].map((m, i) => (
                <div
                  key={i}
                  className={cn('flex gap-3 pl-4 py-1 border-l', m.active ? 'border-primary' : 'border-white/10')}
                >
                  <div>
                    <p className="font-geist text-sm text-on-surface font-medium">{m.title}</p>
                    <p className="font-geist text-[11px] text-on-surface-variant mt-0.5">{m.time}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Planetary Health Index */}
            <div className="mt-6 pt-5 border-t border-white/5">
              <div className="flex justify-between items-center mb-2">
                <span className="font-geist text-[10px] text-on-surface-variant uppercase tracking-wider">Planetary Health Index</span>
                <span className="font-geist text-[10px] text-primary">+0.002%</span>
              </div>
              <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: '72%' }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
          </GlassCard>
        </aside>
      </div>

      {/* Create goal modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateGoalModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
        )}
      </AnimatePresence>
    </div>
  )
}
