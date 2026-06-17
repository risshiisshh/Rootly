import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '../../middleware/auth'
import { checkRateLimit } from '../../middleware/rateLimit'
import { recommendationsRepository } from './recommendations.repository'
import { catchAsync } from '../../errors/errorHandler'
import { recommendationHistoryQuerySchema } from '@/lib/schemas/xai.schema'

export class RecommendationsController {
  /**
   * GET /api/recommendations
   * Returns the authenticated user's recommendation history as structured
   * ExplainableRecommendation objects — the public XAI contract.
   */
  handleGetRecommendations = catchAsync(async (req: NextRequest) => {
    const uid = await verifyAuth(req)
    checkRateLimit(uid, 'recommendations', { limit: 30, windowMs: 60000 })

    // Parse and validate query params
    const { searchParams } = new URL(req.url)
    const queryResult = recommendationHistoryQuerySchema.safeParse({
      limit: searchParams.get('limit') ?? undefined,
    })

    const limit = queryResult.success ? queryResult.data.limit : 10

    const recommendations = await recommendationsRepository.findByUserIdWithXai(uid, limit)

    return NextResponse.json({
      recommendations,
      total: recommendations.length,
      generatedAt: new Date().toISOString(),
    })
  })
}

export const recommendationsController = new RecommendationsController()
