import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '../../middleware/auth'
import { checkRateLimit } from '../../middleware/rateLimit'
import { validateBody } from '../../middleware/validate'
import { chatMessageSchema, detectPromptInjection } from '../../../lib/validators'
import { chatService } from './chat.service'
import { catchAsync } from '../../errors/errorHandler'
import { ValidationError } from '../../errors/AppError'

export class ChatController {
  handleChat = catchAsync(async (req: NextRequest) => {
    const uid = await verifyAuth(req)
    checkRateLimit(uid, 'chat', { limit: 20, windowMs: 60000 })

    const body = await req.json()
    const validated = validateBody(chatMessageSchema, body)

    if (detectPromptInjection(validated.message)) {
      throw new ValidationError('Message content violates safety policies.')
    }

    const customApiKey = req.headers.get('x-gemini-key') || undefined

    const result = await chatService.processChatMessage(
      uid,
      validated.message,
      validated.conversationId,
      customApiKey
    )

    // result already includes { message, conversationId, xpiExplanation? }
    return NextResponse.json(result)
  })
}

export const chatController = new ChatController()
