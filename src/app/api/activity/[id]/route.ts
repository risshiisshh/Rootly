export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { activityController } from '@/backend/features/activity/activity.controller'

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  return activityController.handleUpdate(req, { params })
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  return activityController.handleDelete(req, { params })
}
