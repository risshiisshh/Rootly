export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { reportsController } from '@/backend/features/reports/reports.controller'

export async function POST(req: NextRequest) {
  return reportsController.handleGenerate(req)
}
