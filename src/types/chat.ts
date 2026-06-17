import { Timestamp } from 'firebase/firestore'
import type { ExplainableRecommendation } from './recommendation'

export type MessageRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  conversationId?: string
  role: MessageRole
  content: string
  timestamp: Timestamp
  metadata?: {
    recommendations?: string[]
    emissionsContext?: EmissionsContext
    suggestedActions?: SuggestedAction[]
    /** Structured XAI explanation attached to this AI response */
    xpiExplanation?: ExplainableRecommendation
  }
}

export interface EmissionsContext {
  weeklyTotal: number
  weeklyGoal: number
  topCategories: { category: string; percentage: number }[]
  trend: 'improving' | 'stable' | 'worsening'
}

export interface SuggestedAction {
  title: string
  description: string
  potentialSavingsKg: number
  priority: 'high' | 'medium' | 'low'
}

export interface Conversation {
  id: string
  userId: string
  title: string
  createdAt: Timestamp
  updatedAt: Timestamp
  messageCount: number
}

export interface ChatApiRequest {
  message: string
  conversationId?: string
}

export interface ChatApiResponse {
  message: string
  conversationId: string
  suggestedActions?: SuggestedAction[]
  /** Structured Explainable AI metadata for the top-ranked recommendation */
  xpiExplanation?: ExplainableRecommendation
}
