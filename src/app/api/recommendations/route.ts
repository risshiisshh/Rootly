export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { recommendationsController } from '@/backend/features/coach/recommendations.controller'

export async function GET(req: NextRequest) {
  return recommendationsController.handleGetRecommendations(req)
}
