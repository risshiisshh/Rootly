export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { voiceController } from '@/backend/features/voice/voice.controller'

export async function POST(req: NextRequest) {
  return voiceController.handleVoice(req)
}
