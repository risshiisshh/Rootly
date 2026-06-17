export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { goalsController } from '@/backend/features/goals/goals.controller'

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  return goalsController.handleUpdate(req, { params })
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  return goalsController.handleDelete(req, { params })
}
