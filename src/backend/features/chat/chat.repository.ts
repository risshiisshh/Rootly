import { adminDb, isFirebaseAdminConfigured } from '../../lib/firebaseAdmin'
import type { ChatMessage, Conversation } from '@/types/chat'
import { Timestamp } from 'firebase-admin/firestore'

const mockConversations: Conversation[] = []
const mockChatMessages: Record<string, ChatMessage[]> = {}

export class ChatRepository {
  async getOrCreateConversation(userId: string): Promise<string> {
    if (!isFirebaseAdminConfigured) {
      const existing = mockConversations.find(c => c.userId === userId)
      if (existing) return existing.id
      const id = `mock-conv-${Date.now()}`
      mockConversations.push({
        id,
        userId,
        title: 'New Session',
        createdAt: Timestamp.now() as any,
        updatedAt: Timestamp.now() as any,
        messageCount: 0,
      })
      mockChatMessages[id] = []
      return id
    }

    const colRef = adminDb.collection('conversations')
    const q = colRef.where('userId', '==', userId).orderBy('updatedAt', 'desc').limit(1)
    const snap = await q.get()
    if (!snap.empty) {
      return snap.docs[0].id
    }

    const docRef = await colRef.add({
      userId,
      title: 'New Session',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      messageCount: 0,
    })
    return docRef.id
  }

  async findConversationById(id: string): Promise<Conversation | null> {
    if (!isFirebaseAdminConfigured) {
      return mockConversations.find(c => c.id === id) || null
    }

    const doc = await adminDb.collection('conversations').doc(id).get()
    if (!doc.exists) return null
    return { id: doc.id, ...doc.data() } as Conversation
  }

  async getChatMessages(conversationId: string, limitCount = 20): Promise<ChatMessage[]> {
    if (!isFirebaseAdminConfigured) {
      return (mockChatMessages[conversationId] || []).slice(-limitCount)
    }

    const snap = await adminDb.collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .limit(limitCount)
      .get()

    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as ChatMessage))
  }

  async saveChatMessage(conversationId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<string> {
    if (!isFirebaseAdminConfigured) {
      const id = `mock-msg-${Date.now()}`
      if (!mockChatMessages[conversationId]) {
        mockChatMessages[conversationId] = []
      }
      mockChatMessages[conversationId].push({
        id,
        conversationId,
        ...message,
        timestamp: Timestamp.now() as any,
      })
      return id
    }

    const docRef = await adminDb.collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .add({
        ...message,
        timestamp: Timestamp.now(),
      })

    await adminDb.collection('conversations')
      .doc(conversationId)
      .update({
        updatedAt: Timestamp.now(),
      })

    return docRef.id
  }
}

export const chatRepository = new ChatRepository()
export { mockConversations, mockChatMessages }
