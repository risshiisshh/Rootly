export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { goalsController } from '@/backend/features/goals/goals.controller'

export async function GET(req: NextRequest) {
  return goalsController.handleGet(req)
}

export async function POST(req: NextRequest) {
  return goalsController.handleCreate(req)
}
