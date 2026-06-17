export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { routesController } from '@/backend/features/routes/routes.controller'

export async function POST(req: NextRequest) {
  return routesController.handleCompare(req)
}
