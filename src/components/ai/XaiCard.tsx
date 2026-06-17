'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/glass/GlassCard'
import type { ExplainableRecommendation } from '@/types/recommendation'

// ─── Priority Badge ────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  high: {
    label: 'High Priority',
    icon: 'priority_high',
    className: 'bg-primary/10 text-primary border-primary/25',
    dot: 'bg-primary',
  },
  medium: {
    label: 'Medium Priority',
    icon: 'fiber_manual_record',
    className: 'bg-tertiary/10 text-tertiary border-tertiary/25',
    dot: 'bg-tertiary',
  },
  low: {
    label: 'Low Priority',
    icon: 'fiber_manual_record',
    className: 'bg-on-surface-variant/10 text-on-surface-variant border-outline-variant/25',
    dot: 'bg-on-surface-variant',
  },
} as const

function PriorityBadge({ priority }: { priority: ExplainableRecommendation['priority'] }) {
  const cfg = PRIORITY_CONFIG[priority]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-geist font-semibold uppercase tracking-widest border',
        cfg.className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} aria-hidden="true" />
      {cfg.label}
    </span>
  )
}

// ─── Confidence Gauge ──────────────────────────────────────────────────────────

function ConfidenceGauge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const color =
    pct >= 80 ? 'from-primary to-primary/70' :
    pct >= 60 ? 'from-tertiary to-tertiary/70' :
    'from-on-surface-variant/60 to-on-surface-variant/30'

  const strokeDasharray = 2 * Math.PI * 18 // r=18
  const strokeDashoffset = strokeDasharray * (1 - confidence)

  return (
    <div className="flex items-center gap-2.5" title={`AI Confidence: ${pct}%`}>
      <div className="relative w-11 h-11 shrink-0">
        <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90" aria-hidden="true">
          {/* Track */}
          <circle
            cx="22" cy="22" r="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            className="text-outline-variant/20"
          />
          {/* Progress */}
          <motion.circle
            cx="22" cy="22" r="18"
            fill="none"
            stroke="url(#conf-grad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            initial={{ strokeDashoffset: strokeDasharray }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id="conf-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" className={`stop-color-primary`} stopColor={pct >= 80 ? '#91d883' : pct >= 60 ? '#a8b5a2' : '#6b7a67'} />
              <stop offset="100%" stopColor={pct >= 80 ? '#5aad4b' : pct >= 60 ? '#8a9385' : '#4a5548'} />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-geist font-black text-[11px] text-on-surface">
          {pct}%
        </span>
      </div>
      <div>
        <p className="font-geist text-[10px] text-on-surface-variant uppercase tracking-widest">
          Confidence
        </p>
        <p className="font-geist font-semibold text-on-surface text-xs">
          {pct >= 80 ? 'High' : pct >= 60 ? 'Medium' : 'Low'}
        </p>
      </div>
    </div>
  )
}

// ─── Expandable Section ────────────────────────────────────────────────────────

interface XaiSectionProps {
  icon: string
  label: string
  content: string
  accentColor?: string
}

function XaiSection({ icon, label, content, accentColor = 'text-primary' }: XaiSectionProps) {
  const [open, setOpen] = useState(false)
  const panelId = `xai-section-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  return (
    <div className="border-b border-outline-variant/10 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-white/3 rounded-lg transition-colors group"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn('material-symbols-outlined text-[15px] shrink-0', accentColor)}
            style={open ? { fontVariationSettings: '"FILL" 1' } : {}}
            aria-hidden="true"
          >
            {icon}
          </span>
          <span className="font-geist text-[11px] uppercase tracking-widest text-on-surface-variant group-hover:text-on-surface transition-colors">
            {label}
          </span>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="material-symbols-outlined text-[14px] text-on-surface-variant"
          aria-hidden="true"
        >
          expand_more
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-label={label}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="font-hanken text-on-surface-variant text-sm leading-relaxed pb-3 px-1 pt-0.5">
              {content}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main XaiCard Component ────────────────────────────────────────────────────

interface XaiCardProps {
  explanation: ExplainableRecommendation
  /** Show the full audit trail (calculationDetails) section */
  showAuditTrail?: boolean
  className?: string
}

/**
 * XaiCard — Renders a structured Explainable AI recommendation.
 *
 * Exposes all 6 XAI fields:
 *   Observation · Reasoning · Recommendation · Estimated Impact · Confidence · Priority
 *
 * Plus full audit trail (calculation details) when showAuditTrail is true.
 */
export function XaiCard({ explanation, showAuditTrail = false, className }: XaiCardProps) {
  const [auditOpen, setAuditOpen] = useState(false)

  const savingsFormatted =
    explanation.potentialSavingsKg >= 1
      ? `${explanation.potentialSavingsKg.toFixed(1)}kg CO₂`
      : `${(explanation.potentialSavingsKg * 1000).toFixed(0)}g CO₂`

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn('mt-3', className)}
    >
      <GlassCard variant="primary" hover={false} className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span
                className="material-symbols-outlined text-primary text-[14px]"
                style={{ fontVariationSettings: '"FILL" 1' }}
                aria-hidden="true"
              >
                neurology
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-geist text-[10px] text-primary uppercase tracking-widest">
                AI Explanation
              </p>
              <p className="font-geist font-semibold text-on-surface text-sm truncate" title={explanation.title}>
                {explanation.title}
              </p>
            </div>
          </div>
          <PriorityBadge priority={explanation.priority} />
        </div>

        {/* Confidence + Savings row */}
        <div className="flex items-center justify-between gap-4 bg-surface-container/50 rounded-lg px-3 py-2.5">
          <ConfidenceGauge confidence={explanation.confidence} />
          <div className="text-right">
            <p className="font-geist text-[10px] text-on-surface-variant uppercase tracking-widest">
              Est. Savings
            </p>
            <p className="font-geist font-black text-primary text-lg leading-tight">
              {savingsFormatted}
            </p>
          </div>
        </div>

        {/* Explanation text */}
        <p className="font-hanken text-on-surface-variant text-xs leading-relaxed px-1 italic">
          {explanation.explanation}
        </p>

        {/* XAI Sections */}
        <div className="space-y-0">
          <XaiSection
            icon="visibility"
            label="Observation"
            content={explanation.observation}
            accentColor="text-primary"
          />
          <XaiSection
            icon="psychology"
            label="Reasoning"
            content={explanation.reasoning}
            accentColor="text-tertiary"
          />
          <XaiSection
            icon="lightbulb"
            label="Recommendation"
            content={explanation.recommendation}
            accentColor="text-primary"
          />
          <XaiSection
            icon="bolt"
            label="Estimated Impact"
            content={explanation.impact}
            accentColor="text-primary"
          />
        </div>

        {/* Audit Trail */}
        {(showAuditTrail || explanation.calculationDetails) && (
          <div className="border-t border-outline-variant/10 pt-3">
            <button
              onClick={() => setAuditOpen(!auditOpen)}
              className="w-full flex items-center justify-between text-left group"
              aria-expanded={auditOpen}
              aria-controls="xai-audit-trail"
            >
              <span className="flex items-center gap-1.5 font-geist text-[10px] text-on-surface-variant/85 uppercase tracking-widest group-hover:text-on-surface-variant transition-colors">
                <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
                  receipt_long
                </span>
                Audit Trail
              </span>
              <motion.span
                animate={{ rotate: auditOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="material-symbols-outlined text-[13px] text-on-surface-variant/75"
                aria-hidden="true"
              >
                expand_more
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {auditOpen && (
                <motion.div
                  id="xai-audit-trail"
                  role="region"
                  aria-label="Audit Trail Calculation Details"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 p-2.5 rounded-lg bg-surface-container border border-outline-variant/10 space-y-1.5">
                    <p className="font-geist text-[10px] text-on-surface-variant/85 uppercase tracking-widest mb-1">
                      Calculation
                    </p>
                    <code className="font-mono text-[11px] text-primary/80 leading-relaxed block whitespace-pre-wrap">
                      {explanation.calculationDetails}
                    </code>
                    <div className="flex items-center justify-between pt-1 border-t border-outline-variant/10 mt-2">
                      <span className="font-geist text-[10px] text-on-surface-variant/85">
                        Ranking score
                      </span>
                      <span className="font-geist font-bold text-[11px] text-on-surface">
                        {explanation.rankingScore.toFixed(2)} / 10
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-geist text-[10px] text-on-surface-variant/85">
                        Category
                      </span>
                      <span className="font-geist font-semibold text-[11px] text-on-surface capitalize">
                        {explanation.category}
                      </span>
                    </div>
                    {explanation.generatedAt && (
                      <div className="flex items-center justify-between">
                        <span className="font-geist text-[10px] text-on-surface-variant/85">
                          Generated
                        </span>
                        <span className="font-geist text-[11px] text-on-surface-variant">
                          {new Date(explanation.generatedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </GlassCard>
    </motion.div>
  )
}
