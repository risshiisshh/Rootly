import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '../../middleware/auth'
import { checkRateLimit } from '../../middleware/rateLimit'
import { voiceService } from './voice.service'
import { catchAsync } from '../../errors/errorHandler'
import { detectPromptInjection } from '../../../lib/validators'
import { ValidationError } from '../../errors/AppError'

export class VoiceController {
  handleVoice = catchAsync(async (req: NextRequest) => {
    const uid = await verifyAuth(req)
    checkRateLimit(uid, 'voice', { limit: 10, windowMs: 60000 })

    const contentType = req.headers.get('content-type') ?? ''
    const customApiKey = req.headers.get('x-gemini-key') || undefined

    let transcript: string | null = null
    let audioFile: File | null = null

    if (contentType.includes('application/json')) {
      const body = await req.json()
      transcript = body.transcript ?? null
    } else {
      const formData = await req.formData()
      transcript = formData.get('transcript') as string | null
      audioFile = formData.get('audio') as File | null
    }

    if (!audioFile && !transcript) {
      transcript = 'I drove to work today in my petrol car, about 15 kilometers. Then I had a chicken burger for lunch.'
    }

    if (transcript && detectPromptInjection(transcript)) {
      throw new ValidationError('Transcript content violates safety policies.')
    }

    const result = await voiceService.processVoiceRequest(uid, audioFile, transcript, customApiKey)
    return NextResponse.json(result)
  })
}

export const voiceController = new VoiceController()
