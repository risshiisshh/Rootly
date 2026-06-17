import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '../../middleware/auth'
import { checkRateLimit } from '../../middleware/rateLimit'
import { validateBody } from '../../middleware/validate'
import { createActivitySchema } from '../../../lib/validators'
import { activityService } from './activity.service'
import { catchAsync } from '../../errors/errorHandler'

export class ActivityController {
  handleGet = catchAsync(async (req: NextRequest) => {
    const uid = await verifyAuth(req)
    checkRateLimit(uid, 'activity:get')

    const url = new URL(req.url)
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined
    const category = url.searchParams.get('category') || undefined
    const isWeekly = url.searchParams.get('weekly') === 'true'

    let activities
    if (isWeekly) {
      activities = await activityService.getWeeklyActivities(uid)
    } else {
      activities = await activityService.getActivities(uid, limit, category)
    }

    return NextResponse.json({ activities })
  })

  handleCreate = catchAsync(async (req: NextRequest) => {
    const uid = await verifyAuth(req)
    checkRateLimit(uid, 'activity:create')

    const body = await req.json()
    const validated = validateBody(createActivitySchema, body)

    const activity = await activityService.logActivity(uid, {
      category: validated.category,
      activity: validated.activity,
      quantity: validated.quantity,
      emission: validated.emission,
      description: validated.description ?? '',
    })
    return NextResponse.json({ activity }, { status: 201 })
  })

  handleUpdate = catchAsync(async (req: NextRequest, { params }: { params: { id: string } }) => {
    const uid = await verifyAuth(req)
    checkRateLimit(uid, 'activity:update')

    const id = params.id
    const body = await req.json()

    // Accept partial activity updates
    const activity = await activityService.updateActivity(uid, id, body)
    return NextResponse.json({ activity })
  })

  handleDelete = catchAsync(async (req: NextRequest, { params }: { params: { id: string } }) => {
    const uid = await verifyAuth(req)
    checkRateLimit(uid, 'activity:delete')

    const id = params.id
    await activityService.deleteActivity(uid, id)
    return NextResponse.json({ success: true })
  })
}

export const activityController = new ActivityController()
