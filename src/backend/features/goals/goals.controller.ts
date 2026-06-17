import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { verifyAuth } from '../../middleware/auth'
import { checkRateLimit } from '../../middleware/rateLimit'
import { validateBody } from '../../middleware/validate'
import { createGoalSchema } from '../../../lib/validators'
import { goalsService } from './goals.service'
import { catchAsync } from '../../errors/errorHandler'

export class GoalsController {
  handleGet = catchAsync(async (req: NextRequest) => {
    const uid = await verifyAuth(req)
    checkRateLimit(uid, 'goals:get')

    const goals = await goalsService.getGoals(uid)
    return NextResponse.json({ goals })
  })

  handleCreate = catchAsync(async (req: NextRequest) => {
    const uid = await verifyAuth(req)
    checkRateLimit(uid, 'goals:create')

    const body = await req.json()
    const validated = validateBody(createGoalSchema, body)

    const goal = await goalsService.createGoal(uid, {
      title: validated.title,
      category: validated.category,
      targetReductionKg: validated.targetReductionKg,
      deadline: Timestamp.fromDate(validated.deadline) as any,
      description: validated.description ?? '',
    })
    return NextResponse.json({ goal }, { status: 201 })
  })

  handleUpdate = catchAsync(async (req: NextRequest, { params }: { params: { id: string } }) => {
    const uid = await verifyAuth(req)
    checkRateLimit(uid, 'goals:update')

    const id = params.id
    const body = await req.json()

    const goal = await goalsService.updateGoal(uid, id, body)
    return NextResponse.json({ goal })
  })

  handleDelete = catchAsync(async (req: NextRequest, { params }: { params: { id: string } }) => {
    const uid = await verifyAuth(req)
    checkRateLimit(uid, 'goals:delete')

    const id = params.id
    await goalsService.deleteGoal(uid, id)
    return NextResponse.json({ success: true })
  })
}

export const goalsController = new GoalsController()
