import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '../../middleware/auth'
import { checkRateLimit } from '../../middleware/rateLimit'
import { validateBody } from '../../middleware/validate'
import { catchAsync } from '../../errors/errorHandler'
import { analyticsRepository } from './analytics.repository'
import { z } from 'zod'

const eventSchema = z.object({
  type: z.enum([
    'USER_LOGIN',
    'ACTIVITY_LOGGED',
    'VOICE_LOGGING',
    'CHAT_USAGE',
    'ROUTE_COMPARISON',
    'GOAL_COMPLETION',
    'REPORT_GENERATION',
    'RECOMMENDATION_ACCEPTANCE',
  ]),
  timestamp: z.number(),
  hashedUid: z.string(),
  metadata: z.record(z.any()).optional().default({}),
})

const trackPayloadSchema = z.object({
  events: z.array(eventSchema),
})

export class AnalyticsController {
  handleTrack = catchAsync(async (req: NextRequest) => {
    // Authenticate the calling user to prevent unauthorized API abuse
    const uid = await verifyAuth(req)
    checkRateLimit(uid, 'analytics:track')

    const body = await req.json()
    const validated = validateBody(trackPayloadSchema, body)

    await analyticsRepository.saveBatch(validated.events)

    return NextResponse.json({ success: true })
  })

  handleGetMetrics = catchAsync(async (req: NextRequest) => {
    const uid = await verifyAuth(req)
    checkRateLimit(uid, 'analytics:metrics')

    const dailyMetrics = await analyticsRepository.getDailyMetrics()

    return NextResponse.json({ dailyMetrics })
  })
}

export const analyticsController = new AnalyticsController()
