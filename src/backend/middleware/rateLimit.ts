import { RateLimitError } from '../errors/AppError'

interface RateLimitConfig {
  limit: number
  windowMs: number
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  userId: string,
  keyPrefix: string = 'global',
  config: RateLimitConfig = { limit: 20, windowMs: 60000 }
): void {
  const now = Date.now()
  const compositeKey = `${keyPrefix}:${userId}`
  const entry = rateLimitMap.get(compositeKey)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(compositeKey, {
      count: 1,
      resetAt: now + config.windowMs,
    })
    return
  }

  if (entry.count >= config.limit) {
    throw new RateLimitError()
  }

  entry.count++
}
