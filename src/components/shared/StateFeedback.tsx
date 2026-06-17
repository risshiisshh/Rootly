'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

/* ─── Skeleton Loading Components ─── */

export function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse bg-surface-container-highest/60 rounded',
        className
      )}
      aria-hidden="true"
    />
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('glass-card p-6 rounded-xl space-y-4 pointer-events-none', className)} aria-hidden="true">
      <SkeletonPulse className="h-4 w-1/4 rounded-md" />
      <SkeletonPulse className="h-10 w-2/3 rounded-lg" />
      <div className="space-y-2 pt-2">
        <SkeletonPulse className="h-3 w-full" />
        <SkeletonPulse className="h-3 w-5/6" />
        <SkeletonPulse className="h-3 w-4/5" />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-3.5 rounded-lg border border-outline-variant/10 animate-pulse bg-surface-container/20"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="w-9 h-9 rounded-full bg-surface-container-highest shrink-0" />
            <div className="space-y-2 flex-1">
              <SkeletonPulse className="h-4 w-1/3" />
              <SkeletonPulse className="h-3 w-1/4" />
            </div>
          </div>
          <div className="w-14 h-6 bg-surface-container-highest rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonCircle({ size = 120, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn('rounded-full bg-surface-container-highest/60 animate-pulse flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  )
}

/* ─── Error State Component ─── */

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export function ErrorState({
  title = 'System Error',
  message,
  onRetry,
  retryLabel = 'Retry Connection',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'glass-card p-8 rounded-xl text-center border-error/20 flex flex-col items-center justify-center max-w-lg mx-auto space-y-4 my-6',
        className
      )}
    >
      <div className="w-14 h-14 rounded-full bg-error-container/20 border border-error/30 flex items-center justify-center text-error animate-bounce">
        <span className="material-symbols-outlined text-3xl" aria-hidden="true">
          warning
        </span>
      </div>
      <div>
        <h3 className="font-geist font-bold text-on-surface text-lg uppercase tracking-wide">
          {title}
        </h3>
        <p className="font-hanken text-on-surface-variant text-sm mt-2 leading-relaxed">
          {message}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 bg-error text-on-error font-geist text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-full hover:bg-error/90 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,180,171,0.2)]"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            refresh
          </span>
          {retryLabel}
        </button>
      )}
    </div>
  )
}

/* ─── Actionable Empty State Component ─── */

interface EmptyStateStep {
  icon: string
  title: string
  description: string
}

interface EmptyStateProps {
  icon?: string
  title: string
  description: string
  steps?: EmptyStateStep[]
  action?: {
    label: string
    onClick?: () => void
    href?: string
    icon?: string
  }
  className?: string
}

export function EmptyState({
  icon = 'database_off',
  title,
  description,
  steps,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'glass-card p-8 md:p-10 rounded-xl text-center flex flex-col items-center justify-center max-w-2xl mx-auto space-y-6',
        className
      )}
    >
      {/* Visual Header */}
      <div className="w-16 h-16 rounded-full bg-primary-container/20 border border-primary/20 flex items-center justify-center text-primary">
        <span className="material-symbols-outlined text-3xl" aria-hidden="true">
          {icon}
        </span>
      </div>

      <div className="space-y-2 max-w-md">
        <h3 className="font-geist font-bold text-on-surface text-xl">{title}</h3>
        <p className="font-hanken text-on-surface-variant text-sm leading-relaxed">
          {description}
        </p>
      </div>

      {/* Onboarding step guidance */}
      {steps && steps.length > 0 && (
        <div className="w-full text-left bg-surface-container-low/40 rounded-xl border border-outline-variant/15 p-5 space-y-4">
          <p className="font-geist text-[10px] text-primary font-bold uppercase tracking-widest border-b border-outline-variant/15 pb-2">
            Guided Onboarding Steps
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {steps.map((step, idx) => (
              <div key={idx} className="space-y-1.5 flex flex-col">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary-container/30 text-primary flex items-center justify-center text-[10px] font-mono font-bold">
                    {idx + 1}
                  </div>
                  <span className="material-symbols-outlined text-primary text-[16px]" aria-hidden="true">
                    {step.icon}
                  </span>
                  <span className="font-geist text-xs font-semibold text-on-surface">
                    {step.title}
                  </span>
                </div>
                <p className="font-hanken text-[11px] text-on-surface-variant leading-normal pl-7">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {action && (
        <div className="pt-2">
          {action.href ? (
            <a
              href={action.href}
              className="inline-flex items-center gap-2 bg-primary text-on-primary font-geist font-bold text-xs uppercase tracking-widest px-8 py-3 rounded-full hover:bg-primary/95 active:scale-95 transition-all shadow-[0_0_20px_rgba(145,216,131,0.25)]"
            >
              {action.icon && (
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  {action.icon}
                </span>
              )}
              {action.label}
            </a>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 bg-primary text-on-primary font-geist font-bold text-xs uppercase tracking-widest px-8 py-3 rounded-full hover:bg-primary/95 active:scale-95 transition-all shadow-[0_0_20px_rgba(145,216,131,0.25)]"
            >
              {action.icon && (
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  {action.icon}
                </span>
              )}
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Global Offline Banner Component ─── */

export function OfflineBanner({ isOnline }: { isOnline: boolean }) {
  const [showStatus, setShowStatus] = React.useState(false)
  const [prevOnline, setPrevOnline] = React.useState(true)

  React.useEffect(() => {
    if (!isOnline) {
      setShowStatus(true)
      setPrevOnline(false)
    } else if (!prevOnline) {
      // Transition from offline to online: show success indicator temporarily
      setShowStatus(true)
      const timer = setTimeout(() => {
        setShowStatus(false)
        setPrevOnline(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, prevOnline])

  return (
    <AnimatePresence>
      {showStatus && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-2 left-0 right-0 z-[10000] px-4 pointer-events-none"
        >
          <div
            className={cn(
              'mx-auto max-w-md p-3.5 rounded-full backdrop-blur-xl border shadow-2xl flex items-center justify-between pointer-events-auto',
              isOnline
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-error-container/20 border-error/30 text-error'
            )}
            role="status"
            aria-live="assertive"
          >
            <div className="flex items-center gap-2.5 pl-2">
              {isOnline ? (
                <>
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">wifi</span>
                  <p className="font-geist text-xs font-bold uppercase tracking-wider">
                    Operational // Back Online
                  </p>
                </>
              ) : (
                <>
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-error" />
                  </div>
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">wifi_off</span>
                  <p className="font-geist text-xs font-bold uppercase tracking-wider">
                    Operational // Offline Mode
                  </p>
                </>
              )}
            </div>
            <p className="font-hanken text-[11px] pr-2 text-on-surface-variant">
              {isOnline ? 'Local changes synced' : 'Changes queued locally'}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
