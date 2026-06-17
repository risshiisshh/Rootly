import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes safely
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Format emissions value for display
 */
export function formatEmissions(kg: number, decimals = 1): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(decimals)}t`
  }
  return `${kg.toFixed(decimals)}kg`
}

/**
 * Format a percentage change with sign
 */
export function formatDelta(delta: number, decimals = 1): string {
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(decimals)}%`
}

/**
 * Calculate carbon score (0-100) based on weekly emissions
 */
export function calculateCarbonScore(weeklyEmissionsKg: number): number {
  // Based on global targets: 46kg/week = perfect score, 200kg+ = 0
  const PERFECT = 46
  const MAX = 300
  if (weeklyEmissionsKg <= PERFECT) return 100
  if (weeklyEmissionsKg >= MAX) return 0
  return Math.round(100 - ((weeklyEmissionsKg - PERFECT) / (MAX - PERFECT)) * 100)
}

/**
 * Get score label from numeric score
 */
export function getScoreLabel(score: number): string {
  if (score >= 85) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 55) return 'Fair'
  if (score >= 40) return 'Needs Work'
  return 'Critical'
}

/**
 * Get score color token from numeric score
 */
export function getScoreColor(score: number): string {
  if (score >= 85) return 'text-primary'
  if (score >= 70) return 'text-secondary'
  if (score >= 55) return 'text-tertiary'
  if (score >= 40) return 'text-error'
  return 'text-error'
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Format a date as a relative time string
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

/**
 * Capitalize the first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Truncate text to a max length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Wait for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Get week start (Monday) for a given date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get week end (Sunday) for a given date
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

/**
 * Safely read a value from localStorage without throwing errors in Node/JSDOM environments
 */
export function getSafeLocalStorage(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key)
    }
  } catch {
    // Ignore security/access errors in server-side or testing context
  }
  return null
}
