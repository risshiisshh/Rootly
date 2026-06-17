import { chatRepository } from './chat.repository'
import { contextRetriever } from '../coach/context.retriever'
import { recommendationEngine } from '../coach/recommendation.engine'
import { recommendationsRepository } from '../coach/recommendations.repository'
import { sendChatMessage } from '../../../services/claude'
import { cacheService } from '../../lib/cache'
import { toExplainableRecommendation } from '@/types/recommendation'
import type { ExplainableRecommendation } from '@/types/recommendation'
import { NotFoundError, UnauthorizedError } from '../../errors/AppError'

const QUERY_CACHE_TTL = 10 * 1000 // 10 seconds query cache

export class ChatService {
  async processChatMessage(
    userId: string,
    message: string,
    conversationId?: string,
    customApiKey?: string
  ): Promise<{ message: string; conversationId: string; xpiExplanation?: ExplainableRecommendation }> {
    // 1. Get or create conversation ID
    let activeConvId = conversationId
    if (activeConvId) {
      const conversation = await chatRepository.findConversationById(activeConvId)
      if (!conversation) {
        throw new NotFoundError('Conversation not found')
      }
      if (conversation.userId !== userId) {
        throw new UnauthorizedError('Unauthorized access to this conversation')
      }
    } else {
      activeConvId = await chatRepository.getOrCreateConversation(userId)
    }

    const trimmedMsg = message.trim()
    const queryCacheKey = `chat-query:${userId}:${activeConvId}:${trimmedMsg}`
    
    // Check query cache for identical consecutive messages
    const cachedResponse = cacheService.get<{ message: string; conversationId: string }>(queryCacheKey)
    if (cachedResponse) {
      return cachedResponse
    }

    try {
      // 2. Save user message to database
      await chatRepository.saveChatMessage(activeConvId, {
        conversationId: activeConvId,
        role: 'user',
        content: message,
        metadata: {},
      })

      // 3. Load user context using contextRetriever (which has its own cache)
      const context = await contextRetriever.retrieve(userId, activeConvId)

      // 4. Generate recommendations and store top-ranked recommendation metadata
      const recommendations = recommendationEngine.generateRecommendations(context)
      const topRec = recommendations[0]
      let xpiExplanation: ExplainableRecommendation | undefined

      if (topRec) {
        // Persist to Firestore for history/audit trail
        await recommendationsRepository.save(userId, {
          title: topRec.title,
          category: topRec.category,
          priority: topRec.priority,
          observation: topRec.observation,
          reasoning: topRec.reasoning,
          recommendation: topRec.recommendation,
          estimatedImpact: topRec.estimatedImpact,
          potentialSavingsKg: topRec.potentialSavingsKg,
          easeOfImplementation: topRec.easeOfImplementation,
          userRelevance: topRec.userRelevance,
          historicalBehaviorScore: topRec.historicalBehaviorScore,
          rankingScore: topRec.rankingScore,
          confidenceScore: topRec.confidenceScore,
          explanation: topRec.explanation,
          calculationDetails: topRec.calculationDetails,
        })

        // Map to the public XAI contract
        xpiExplanation = toExplainableRecommendation(topRec)
      }

      // 5. Request AI response
      const response = await sendChatMessage(
        message,
        {
          user: context.user,
          recentActivities: context.recentActivities,
          weeklyActivities: context.weeklyActivities,
          activeGoals: context.activeGoals,
          weeklyEmissionsKg: context.weeklyEmissionsKg,
          previousWeekEmissionsKg: context.previousWeekEmissionsKg,
          trend: context.trend,
          carbonScore: context.carbonScore,
          conversationHistory: context.conversationHistory,
        },
        customApiKey
      )

      // 5. Save assistant message
      await chatRepository.saveChatMessage(activeConvId, {
        conversationId: activeConvId,
        role: 'assistant',
        content: response.content,
        metadata: {},
      })

      const result = {
        message: response.content,
        conversationId: activeConvId,
        xpiExplanation,
      }

      // 6. Cache query response
      cacheService.set(queryCacheKey, result, QUERY_CACHE_TTL)

      return result
    } catch (error) {
      console.error('Error in ChatService.processChatMessage:', error)
      throw error
    }
  }
}

export const chatService = new ChatService()

