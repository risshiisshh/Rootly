import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '../../middleware/auth'
import { checkRateLimit } from '../../middleware/rateLimit'
import { validateBody } from '../../middleware/validate'
import { routeRequestSchema } from '../../../lib/validators'
import { routesService } from './routes.service'
import { catchAsync } from '../../errors/errorHandler'

export class RoutesController {
  handleCompare = catchAsync(async (req: NextRequest) => {
    const uid = await verifyAuth(req)
    checkRateLimit(uid, 'routes:compare')

    const body = await req.json()
    const validated = validateBody(routeRequestSchema, body)

    const customApiKey = req.headers.get('x-gemini-key') || undefined

    const comparison = await routesService.compareRoutes(
      uid,
      validated.origin,
      validated.destination,
      customApiKey
    )

    return NextResponse.json({ comparison })
  })
}

export const routesController = new RoutesController()
