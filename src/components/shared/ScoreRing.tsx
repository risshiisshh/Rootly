'use client'

import { cn, clamp } from '@/lib/utils'
import { useEffect, useRef } from 'react'

interface ScoreRingProps {
  score: number       // 0-100
  size?: number       // SVG size in px
  strokeWidth?: number
  label?: string
  sublabel?: string
  animated?: boolean
  className?: string
}

/**
 * ScoreRing — Animated SVG ring displaying a carbon score (0–100).
 * Uses the Stitch gradient from primary-container to primary.
 */
export function ScoreRing({
  score,
  size = 200,
  strokeWidth = 8,
  label,
  sublabel,
  animated = true,
  className,
}: ScoreRingProps) {
  const circleRef = useRef<SVGCircleElement>(null)
  const clampedScore = clamp(score, 0, 100)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const targetOffset = circumference - (clampedScore / 100) * circumference
  const gradientId = `score-gradient-${size}`

  useEffect(() => {
    if (!circleRef.current || !animated) return
    circleRef.current.style.strokeDashoffset = String(circumference)
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (circleRef.current) {
          circleRef.current.style.strokeDashoffset = String(targetOffset)
        }
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [score, circumference, targetOffset, animated])

  const scoreColor = clampedScore >= 75 ? '#91d883' : clampedScore >= 55 ? '#ccc7ac' : '#ffb4ab'

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-label={`Carbon score: ${clampedScore} out of 100`}
        role="img"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d530e" />
            <stop offset="100%" stopColor="#91d883" />
          </linearGradient>
        </defs>
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1a1c1a"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? circumference : targetOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: animated ? 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' : undefined }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span
          className="font-geist font-black leading-none"
          style={{
            fontSize: size * 0.3,
            color: scoreColor,
            textShadow: `0 0 ${size * 0.15}px ${scoreColor}40`,
          }}
        >
          {clampedScore}
        </span>
        {label && (
          <span
            className="font-geist font-bold uppercase tracking-widest text-primary mt-1"
            style={{ fontSize: size * 0.07 }}
          >
            {label}
          </span>
        )}
        {sublabel && (
          <span
            className="text-on-surface-variant mt-0.5"
            style={{ fontSize: size * 0.06 }}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  )
}

interface EmissionBadgeProps {
  kg: number
  trend?: 'up' | 'down' | 'neutral'
  size?: 'sm' | 'md' | 'lg'
}

/**
 * EmissionBadge — Compact badge displaying a CO2 emission value with trend indicator.
 */
export function EmissionBadge({ kg, trend, size = 'md' }: EmissionBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm',
  }
  const formatted = kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${kg.toFixed(1)}kg`
  const colorClass =
    trend === 'down'
      ? 'bg-secondary-container text-secondary'
      : trend === 'up'
      ? 'bg-error-container/30 text-error'
      : 'bg-surface-container-high text-on-surface-variant'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-geist font-bold uppercase tracking-tight',
        sizeClasses[size],
        colorClass
      )}
    >
      {trend === 'down' && (
        <>
          <span aria-hidden="true">↓</span>
          <span className="sr-only">(decreasing)</span>
        </>
      )}
      {trend === 'up' && (
        <>
          <span aria-hidden="true">↑</span>
          <span className="sr-only">(increasing)</span>
        </>
      )}
      {formatted} CO₂
    </span>
  )
}

interface KineticBarProps {
  value: number // 0-100 percentage
  label?: string
  showValue?: boolean
  className?: string
}

/**
 * KineticBar — Animated shimmer progress bar from the Stitch design system.
 */
export function KineticBar({ value, label, showValue = true, className }: KineticBarProps) {
  const pct = clamp(value, 0, 100)
  return (
    <div className={cn('space-y-1.5', className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          {label && <span className="text-on-surface-variant font-geist text-label-md">{label}</span>}
          {showValue && (
            <span className="text-primary font-bold font-geist text-label-md">{pct}%</span>
          )}
        </div>
      )}
      <div
        className="h-2 bg-surface-container rounded-full overflow-hidden relative"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? `${pct}%`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #0d530e 0%, #91d883 100%)',
          }}
        >
          {/* Shimmer overlay */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
              animation: 'shimmer 2s infinite',
            }}
          />
        </div>
      </div>
    </div>
  )
}
