export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { activityController } from '@/backend/features/activity/activity.controller'

export async function GET(req: NextRequest) {
  return activityController.handleGet(req)
}

export async function POST(req: NextRequest) {
  return activityController.handleCreate(req)
}
