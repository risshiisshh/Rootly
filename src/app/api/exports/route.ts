export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { exportsController } from '@/backend/features/exports/exports.controller'

export async function GET(req: NextRequest) {
  return exportsController.handleGetHistory(req)
}

export async function POST(req: NextRequest) {
  return exportsController.handleCreateExport(req)
}
