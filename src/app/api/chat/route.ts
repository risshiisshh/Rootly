export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { chatController } from '@/backend/features/chat/chat.controller'

export async function POST(req: NextRequest) {
  return chatController.handleChat(req)
}
