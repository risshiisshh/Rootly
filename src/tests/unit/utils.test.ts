import { describe, it, expect } from 'vitest'
import {
  formatEmissions,
  formatRelativeTime,
  cn,
  getWeekStart,
  getWeekEnd,
  formatDelta,
  calculateCarbonScore,
  getScoreLabel,
  getScoreColor,
  capitalize,
  clamp,
  truncate,
  generateId,
  sleep,
  debounce,
} from '../../lib/utils'

describe('formatEmissions', () => {
  it('shows kg for values under 1000kg', () => {
    expect(formatEmissions(0.5)).toContain('kg')
  })

  it('shows kg for values 1–999kg', () => {
    expect(formatEmissions(1.5)).toContain('kg')
  })

  it('shows tonnes for values 1000kg+', () => {
    expect(formatEmissions(1500)).toContain('t')
  })

  it('handles zero', () => {
    expect(formatEmissions(0)).toBe('0.0kg')
  })

  it('handles very small values', () => {
    expect(formatEmissions(0.001)).toContain('kg')
  })
})

describe('formatRelativeTime', () => {
  it('returns "just now" for recent timestamps', () => {
    const d = new Date()
    expect(formatRelativeTime(d)).toBe('just now')
  })

  it('returns minutes for timestamps < 1h ago', () => {
    const d = new Date(Date.now() - 30 * 60 * 1000)
    expect(formatRelativeTime(d)).toMatch(/m ago/)
  })

  it('returns hours for timestamps 1–24h ago', () => {
    const d = new Date(Date.now() - 3 * 60 * 60 * 1000)
    expect(formatRelativeTime(d)).toMatch(/h ago/)
  })

  it('returns days for older timestamps', () => {
    const d = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    expect(formatRelativeTime(d)).toMatch(/d ago/)
  })
})

describe('cn (classnames utility)', () => {
  it('merges class strings', () => {
    const result = cn('foo', 'bar')
    expect(result).toContain('foo')
    expect(result).toContain('bar')
  })

  it('handles conditional classes', () => {
    const result = cn('base', false && 'hidden', 'visible')
    expect(result).not.toContain('hidden')
    expect(result).toContain('visible')
  })

  it('handles undefined/null values', () => {
    expect(() => cn('foo', undefined, null as unknown as string)).not.toThrow()
  })

  it('deduplicates Tailwind conflicts', () => {
    const result = cn('text-red-500', 'text-blue-500')
    // twMerge should keep only the last one
    expect(result).toBe('text-blue-500')
  })
})

describe('getWeekStart / getWeekEnd', () => {
  it('getWeekStart returns Monday at midnight', () => {
    const d = new Date('2024-06-15T12:00:00') // Saturday
    const start = getWeekStart(d)
    expect(start.getDay()).toBe(1) // Monday
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
  })

  it('getWeekEnd returns Sunday 23:59:59', () => {
    const d = new Date('2024-06-15T12:00:00')
    const end = getWeekEnd(d)
    expect(end.getDay()).toBe(0) // Sunday
    expect(end.getHours()).toBe(23)
  })

  it('week start is before week end', () => {
    const d = new Date()
    expect(getWeekStart(d).getTime()).toBeLessThan(getWeekEnd(d).getTime())
  })
})

describe('formatDelta', () => {
  it('adds + sign for positive percentages', () => {
    expect(formatDelta(12.5)).toBe('+12.5%')
  })

  it('keeps - sign for negative percentages', () => {
    expect(formatDelta(-5)).toBe('-5.0%')
  })

  it('formats zero correctly', () => {
    expect(formatDelta(0)).toBe('0.0%')
  })
})

describe('calculateCarbonScore', () => {
  it('returns 100 for emissions at or below perfect limit (46kg)', () => {
    expect(calculateCarbonScore(30)).toBe(100)
    expect(calculateCarbonScore(46)).toBe(100)
  })

  it('returns 0 for emissions at or above max limit (300kg)', () => {
    expect(calculateCarbonScore(300)).toBe(0)
    expect(calculateCarbonScore(400)).toBe(0)
  })

  it('calculates score proportionally for middle values', () => {
    // 173kg is right in the middle between 46 and 300
    // Math.round(100 - (127 / 254) * 100) = 50
    expect(calculateCarbonScore(173)).toBe(50)
  })
})

describe('getScoreLabel / getScoreColor', () => {
  it('returns correct label for various scores', () => {
    expect(getScoreLabel(90)).toBe('Excellent')
    expect(getScoreLabel(75)).toBe('Good')
    expect(getScoreLabel(60)).toBe('Fair')
    expect(getScoreLabel(45)).toBe('Needs Work')
    expect(getScoreLabel(20)).toBe('Critical')
  })

  it('returns correct color classes for various scores', () => {
    expect(getScoreColor(90)).toBe('text-primary')
    expect(getScoreColor(75)).toBe('text-secondary')
    expect(getScoreColor(60)).toBe('text-tertiary')
    expect(getScoreColor(45)).toBe('text-error')
    expect(getScoreColor(20)).toBe('text-error')
  })
})

describe('capitalize', () => {
  it('capitalizes the first letter of a string', () => {
    expect(capitalize('rootly')).toBe('Rootly')
    expect(capitalize('hello world')).toBe('Hello world')
  })
})

describe('clamp', () => {
  it('clamps values correctly', () => {
    expect(clamp(15, 10, 20)).toBe(15)
    expect(clamp(5, 10, 20)).toBe(10)
    expect(clamp(25, 10, 20)).toBe(20)
  })
})

describe('truncate', () => {
  it('truncates longer strings with ellipsis', () => {
    expect(truncate('Hello world', 5)).toBe('Hello...')
    expect(truncate('Hi', 5)).toBe('Hi')
  })
})

describe('generateId', () => {
  it('generates a unique id string', () => {
    const id1 = generateId()
    const id2 = generateId()
    expect(id1).not.toBe(id2)
    expect(id1).toMatch(/^\d+-/)
  })
})

describe('sleep', () => {
  it('resolves after specified delay', async () => {
    const start = Date.now()
    await sleep(20)
    const diff = Date.now() - start
    expect(diff).toBeGreaterThanOrEqual(15)
  })
})

describe('debounce', () => {
  it('debounces a function call', async () => {
    let count = 0
    const increment = debounce(() => {
      count++
    }, 20)

    increment()
    increment()
    increment()

    expect(count).toBe(0)
    await sleep(40)
    expect(count).toBe(1)
  })
})
