export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { analyticsController } from '@/backend/features/analytics/analytics.controller'

export async function GET(req: NextRequest) {
  return analyticsController.handleGetMetrics(req)
}

export async function POST(req: NextRequest) {
  return analyticsController.handleTrack(req)
}
