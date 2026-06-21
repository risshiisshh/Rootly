import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { contextRetriever } from '../../backend/features/coach/context.retriever'
import { recommendationEngine } from '../../backend/features/coach/recommendation.engine'
import { promptManager } from '../../backend/features/coach/prompt.manager'
import { userRepository } from '../../backend/features/profile/user.repository'
import { activityRepository } from '../../backend/features/activity/activity.repository'
import { goalsRepository } from '../../backend/features/goals/goals.repository'
import { chatRepository } from '../../backend/features/chat/chat.repository'
import { recommendationsRepository } from '../../backend/features/coach/recommendations.repository'
import { cacheService } from '../../backend/lib/cache'
import { Timestamp } from 'firebase-admin/firestore'
import { toExplainableRecommendation } from '../../types/recommendation'
import { explainableRecommendationSchema, isExplainableRecommendation, parseExplainableRecommendation } from '../../lib/schemas/xai.schema'

describe('Carbon Coach AI System', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    cacheService.clear()
  })

  describe('ContextRetriever', () => {
    it('retrieves and aggregates context correctly', async () => {
      const now = new Date()
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)

      const mockUser = {
        uid: 'user-1',
        displayName: 'Test User',
        email: 'test@rootly.green',
        photoURL: null,
        carbonScore: 85,
        totalEmissionsKg: 100,
        weeklyGoalKg: 50,
        createdAt: Timestamp.fromDate(now) as any,
        updatedAt: Timestamp.fromDate(now) as any,
      }

      const mockRecentActivities = [
        {
          id: 'act-1',
          userId: 'user-1',
          category: 'transport' as const,
          activity: 'car',
          quantity: 100,
          emission: 19.2, // 100 * 0.192
          timestamp: Timestamp.fromDate(oneDayAgo) as any,
        },
        {
          id: 'act-2',
          userId: 'user-1',
          category: 'transport' as const,
          activity: 'car',
          quantity: 50,
          emission: 9.6, // 50 * 0.192
          timestamp: Timestamp.fromDate(eightDaysAgo) as any, // previous week
        }
      ]

      const mockWeeklyActivities = [
        mockRecentActivities[0] // only the one within 7 days
      ]

      const mockGoals = [
        {
          id: 'goal-1',
          userId: 'user-1',
          title: 'Reduce driving',
          description: 'Drive less than 50km',
          category: 'transport',
          targetReductionKg: 10,
          currentProgressKg: 5,
          status: 'active',
          deadline: Timestamp.fromDate(now) as any,
          createdAt: Timestamp.fromDate(now) as any,
          updatedAt: Timestamp.fromDate(now) as any,
        }
      ]

      const mockHistory = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user' as const,
          content: 'Hello Coach',
          timestamp: Timestamp.fromDate(now) as any,
        }
      ]

      const userSpy = vi.spyOn(userRepository, 'findById').mockResolvedValue(mockUser)
      const recentSpy = vi.spyOn(activityRepository, 'findByUserId').mockResolvedValue(mockRecentActivities)
      const weeklySpy = vi.spyOn(activityRepository, 'findWeekly').mockResolvedValue(mockWeeklyActivities)
      const goalsSpy = vi.spyOn(goalsRepository, 'findByUserId').mockResolvedValue(mockGoals as any)
      const chatSpy = vi.spyOn(chatRepository, 'getChatMessages').mockResolvedValue(mockHistory)
      const recsSpy = vi.spyOn(recommendationsRepository, 'findByUserId').mockResolvedValue([])

      // 1. First retrieval (fetches from repositories)
      const context = await contextRetriever.retrieve('user-1', 'conv-1')

      expect(userSpy).toHaveBeenCalledTimes(1)
      expect(recentSpy).toHaveBeenCalledTimes(1)
      expect(weeklySpy).toHaveBeenCalledTimes(1)
      expect(goalsSpy).toHaveBeenCalledTimes(1)
      expect(chatSpy).toHaveBeenCalledTimes(1)
      expect(recsSpy).toHaveBeenCalledTimes(1)

      expect(context.user.displayName).toBe('Test User')
      expect(context.weeklyEmissionsKg).toBe(19.2)
      expect(context.previousWeekEmissionsKg).toBe(9.6)
      expect(context.trend).toBe('worsening') // 19.2 > 9.6 * 1.05
      expect(context.activeGoals).toHaveLength(1)
      expect(context.conversationHistory).toHaveLength(1)

      // 2. Second retrieval (hits cache)
      const cachedContext = await contextRetriever.retrieve('user-1', 'conv-1')
      expect(cachedContext).toEqual(context)
      
      // Repositories should not be called again
      expect(userSpy).toHaveBeenCalledTimes(1)
      expect(recentSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('RecommendationEngine', () => {
    const baseUser = {
      uid: 'user-1',
      displayName: 'Eco Explorer',
      email: 'eco@explorer.com',
      photoURL: null,
      carbonScore: 75,
      totalEmissionsKg: 100,
      weeklyGoalKg: 100,
      createdAt: Timestamp.now() as any,
      updatedAt: Timestamp.now() as any,
    }

    it('calculates deterministic savings for transport top category (car driving)', () => {
      const context = {
        user: baseUser,
        recentActivities: [],
        weeklyActivities: [
          {
            id: 'act-1',
            userId: 'user-1',
            category: 'transport' as const,
            activity: 'car',
            quantity: 100, // 100 km
            emission: 19.2,
            timestamp: Timestamp.now() as any,
          }
        ],
        activeGoals: [],
        weeklyEmissionsKg: 19.2,
        previousWeekEmissionsKg: 0,
        trend: 'stable' as const,
        carbonScore: 75,
        conversationHistory: [],
      }

      const recs = recommendationEngine.generateRecommendations(context)
      expect(recs.length).toBeGreaterThanOrEqual(2)
      
      // Switch car commutes to electric train
      const trainRec = recs.find(r => r.title.includes('train'))
      expect(trainRec).toBeDefined()
      expect(trainRec?.potentialSavingsKg).toBe(15.1) // 100 * (0.192 - 0.041) = 15.1
      expect(trainRec?.priority).toBe('high')
      expect(trainRec?.calculationDetails).toContain('100.0 km * 0.151 kg/km savings')

      // Switch car travel to EV
      const evRec = recs.find(r => r.title.includes('electric vehicle'))
      expect(evRec).toBeDefined()
      expect(evRec?.potentialSavingsKg).toBe(13.9) // 100 * (0.192 - 0.053) = 13.9
      expect(evRec?.priority).toBe('medium')
    })

    it('calculates deterministic savings for food top category (red meat)', () => {
      const context = {
        user: baseUser,
        recentActivities: [],
        weeklyActivities: [
          {
            id: 'act-1',
            userId: 'user-1',
            category: 'food' as const,
            activity: 'red_meat',
            quantity: 1,
            emission: 3.2,
            timestamp: Timestamp.now() as any,
          },
          {
            id: 'act-2',
            userId: 'user-1',
            category: 'food' as const,
            activity: 'red_meat',
            quantity: 1,
            emission: 3.2,
            timestamp: Timestamp.now() as any,
          }
        ],
        activeGoals: [],
        weeklyEmissionsKg: 6.4,
        previousWeekEmissionsKg: 0,
        trend: 'stable' as const,
        carbonScore: 75,
        conversationHistory: [],
      }

      const recs = recommendationEngine.generateRecommendations(context)
      expect(recs.length).toBeGreaterThanOrEqual(2)

      // Replace red meat with plant-based
      const plantRec = recs.find(r => r.title.includes('plant-based'))
      expect(plantRec).toBeDefined()
      expect(plantRec?.potentialSavingsKg).toBe(5.4) // 2 meals * 2.7 = 5.4
      expect(plantRec?.priority).toBe('high')

      // Substitution with poultry
      const chickenRec = recs.find(r => r.title.includes('poultry'))
      expect(chickenRec).toBeDefined()
      expect(chickenRec?.potentialSavingsKg).toBe(3.4) // 2 meals * 1.7 = 3.4
      expect(chickenRec?.priority).toBe('medium')
    })

    it('returns standard fallback recommendations when no activities exist', () => {
      const context = {
        user: baseUser,
        recentActivities: [],
        weeklyActivities: [],
        activeGoals: [],
        weeklyEmissionsKg: 0,
        previousWeekEmissionsKg: 0,
        trend: 'stable' as const,
        carbonScore: 75,
        conversationHistory: [],
      }

      const recs = recommendationEngine.generateRecommendations(context)
      expect(recs.length).toBeGreaterThanOrEqual(2)
      
      const transportRec = recs.find(r => r.category === 'transport')
      const foodRec = recs.find(r => r.category === 'food')
      expect(transportRec).toBeDefined()
      expect(foodRec).toBeDefined()
    })
  })

  describe('PromptManager', () => {
    it('builds system prompt containing user details and strict JSON rules', () => {
      const context = {
        user: {
          uid: 'user-1',
          displayName: 'Jane Doe',
          email: 'jane@rootly.green',
          photoURL: null,
          carbonScore: 88,
          totalEmissionsKg: 200,
          weeklyGoalKg: 80,
          createdAt: Timestamp.now() as any,
          updatedAt: Timestamp.now() as any,
        },
        recentActivities: [],
        weeklyActivities: [],
        activeGoals: [
          {
            id: 'goal-1',
            userId: 'user-1',
            title: 'Use bus',
            description: 'Take bus instead of car',
            category: 'transport',
            targetReductionKg: 15,
            currentProgressKg: 3,
            status: 'active' as const,
            deadline: Timestamp.now() as any,
            createdAt: Timestamp.now() as any,
            updatedAt: Timestamp.now() as any,
          }
        ],
        weeklyEmissionsKg: 25.5,
        previousWeekEmissionsKg: 30.0,
        trend: 'improving' as const,
        carbonScore: 88,
        conversationHistory: [],
      }

      const recommendations: any[] = [
        {
          id: 'rec-1',
          userId: 'user-1',
          title: 'Swap driving for cycling',
          category: 'transport',
          priority: 'high' as const,
          potentialSavingsKg: 1.9,
          easeOfImplementation: 7,
          userRelevance: 8.5,
          historicalBehaviorScore: 8.0,
          rankingScore: 8.2,
          confidenceScore: 0.9,
          explanation: 'Prioritized because driving commutes dominate footprint.',
          calculationDetails: '10km * 0.192 kg/km = 1.92 kg CO2 savings',
          observation: 'Your transportation emissions are high.',
          reasoning: 'Switching to cycling removes travel emissions.',
          recommendation: 'Swap driving for cycling.',
          estimatedImpact: 'Reduces your footprint by 1.9 kg CO2.',
          createdAt: Timestamp.now() as any,
        }
      ]

      const prompt = promptManager.buildSystemPrompt(context, recommendations)

      // Should contain user context
      expect(prompt).toContain('Jane Doe')
      expect(prompt).toContain('88/100')
      expect(prompt).toContain('80.0kg') // formatted weeklyGoal
      expect(prompt).toContain('25.5kg') // formatted weekly emissions
      expect(prompt).toContain('improving')

      // Should contain deterministic recommendation details
      expect(prompt).toContain('Swap driving for cycling')
      expect(prompt).toContain('1.9kg') // formatted savings
      expect(prompt).toContain('10km * 0.192 kg/km = 1.92 kg CO2 savings')

      // Should contain strict output format instructions
      expect(prompt).toContain('"observation":')
      expect(prompt).toContain('"reasoning":')
      expect(prompt).toContain('"recommendation":')
      expect(prompt).toContain('"estimatedImpact":')
      expect(prompt).toContain('JSON') // or mention of JSON output
    })
  })

  describe('RecommendationEngine Audits', () => {
    const baseUser = {
      uid: 'user-123',
      displayName: 'Eco Architect',
      email: 'architect@rootly.green',
      photoURL: null,
      carbonScore: 80,
      totalEmissionsKg: 150,
      weeklyGoalKg: 100,
      createdAt: Timestamp.now() as any,
      updatedAt: Timestamp.now() as any,
    }

    it('ranks recommendations by multi-factor scoring (impact, ease, relevance, behavior)', () => {
      const context = {
        user: baseUser,
        recentActivities: [],
        weeklyActivities: [
          {
            id: 'act-1',
            userId: 'user-123',
            category: 'transport' as const,
            activity: 'car',
            quantity: 120, // 120 km driving -> high impact/behavior
            emission: 23.04,
            timestamp: Timestamp.now() as any,
          }
        ],
        activeGoals: [],
        weeklyEmissionsKg: 23.04,
        previousWeekEmissionsKg: 0,
        trend: 'stable' as const,
        carbonScore: 80,
        conversationHistory: [],
        previousRecommendations: [],
      }

      const recs = recommendationEngine.generateRecommendations(context)
      expect(recs.length).toBeGreaterThan(0)

      // Top recommendation should be the train commute swap due to high impact and high driving behavior score
      const topRec = recs[0]
      expect(topRec.title).toBe('Switch car commutes to electric train')
      expect(topRec.rankingScore).toBeGreaterThan(6.0)
      expect(topRec.easeOfImplementation).toBe(5)
      expect(topRec.userRelevance).toBeCloseTo(8.0, 1) // transport is 100% of emissions
      expect(topRec.historicalBehaviorScore).toBeCloseTo(10.0, 1) // 120km / 10 = 10 (capped at 10)
    })

    it('applies a penalty score to recently recommended options to promote diversity', () => {
      const contextWithoutHistory = {
        user: baseUser,
        recentActivities: [],
        weeklyActivities: [
          {
            id: 'act-1',
            userId: 'user-123',
            category: 'transport' as const,
            activity: 'car',
            quantity: 100,
            emission: 19.2,
            timestamp: Timestamp.now() as any,
          }
        ],
        activeGoals: [],
        weeklyEmissionsKg: 19.2,
        previousWeekEmissionsKg: 0,
        trend: 'stable' as const,
        carbonScore: 80,
        conversationHistory: [],
        previousRecommendations: [],
      }

      // 1. Without previous recommendations, "Switch car commutes to electric train" is the top recommendation
      const recsWithoutHistory = recommendationEngine.generateRecommendations(contextWithoutHistory)
      const firstTop = recsWithoutHistory[0]
      expect(firstTop.title).toBe('Switch car commutes to electric train')

      // 2. Introduce "Switch car commutes to electric train" as a previous recommendation
      const contextWithHistory = {
        ...contextWithoutHistory,
        previousRecommendations: [
          {
            id: 'prev-1',
            userId: 'user-123',
            title: 'Switch car commutes to electric train',
            category: 'transport',
            priority: 'high' as const,
            potentialSavingsKg: 15.1,
            easeOfImplementation: 5,
            userRelevance: 8,
            historicalBehaviorScore: 10,
            rankingScore: 7.5,
            confidenceScore: 0.8,
            explanation: 'Prioritized due to transport logs.',
            calculationDetails: '',
            observation: '',
            reasoning: '',
            recommendation: '',
            estimatedImpact: '',
            createdAt: Timestamp.now() as any,
          }
        ],
      }

      const recsWithHistory = recommendationEngine.generateRecommendations(contextWithHistory)
      
      const trainRec = recsWithHistory.find(r => r.title === 'Switch car commutes to electric train')
      const originalScore = firstTop.rankingScore
      const penalizedScore = trainRec?.rankingScore ?? 0

      // The ranking score of the penalized recommendation should be lower by exactly 3.0 points
      expect(penalizedScore).toBeCloseTo(originalScore - 3.0, 2)
      
      // Train should no longer be the top recommendation due to the penalty
      expect(recsWithHistory[0].title).not.toBe('Switch car commutes to electric train')
    })

    it('calculates confidence scores based on data logging completeness', () => {
      const lowCompletenessCtx = {
        user: baseUser,
        recentActivities: [],
        weeklyActivities: [
          { id: 'act-1', userId: 'user-123', category: 'food' as const, activity: 'red_meat', quantity: 1, emission: 3.2, timestamp: Timestamp.now() as any }
        ],
        activeGoals: [],
        weeklyEmissionsKg: 3.2,
        previousWeekEmissionsKg: 0,
        trend: 'stable' as const,
        carbonScore: 80,
        conversationHistory: [],
        previousRecommendations: [],
      }

      const highCompletenessCtx = {
        user: baseUser,
        recentActivities: [],
        weeklyActivities: Array(8).fill(null).map((_, i) => ({
          id: `act-${i}`,
          userId: 'user-123',
          category: 'food' as const,
          activity: 'red_meat',
          quantity: 1,
          emission: 3.2,
          timestamp: Timestamp.now() as any,
        })),
        activeGoals: [],
        weeklyEmissionsKg: 25.6,
        previousWeekEmissionsKg: 0,
        trend: 'stable' as const,
        carbonScore: 80,
        conversationHistory: [],
        previousRecommendations: [],
      }

      const lowRecs = recommendationEngine.generateRecommendations(lowCompletenessCtx)
      const highRecs = recommendationEngine.generateRecommendations(highCompletenessCtx)

      const lowConf = lowRecs.find(r => r.title.includes('Replace red meat'))?.confidenceScore ?? 0
      const highConf = highRecs.find(r => r.title.includes('Replace red meat'))?.confidenceScore ?? 0

      expect(highConf).toBeGreaterThan(lowConf)
      expect(highConf).toBe(0.9) // >= 7 logs
      expect(lowConf).toBe(0.5)  // < 4 logs
    })

    it('populates structured fields and explanation layer', () => {
      const context = {
        user: baseUser,
        recentActivities: [],
        weeklyActivities: [
          {
            id: 'act-1',
            userId: 'user-123',
            category: 'food' as const,
            activity: 'red_meat',
            quantity: 3,
            emission: 9.6,
            timestamp: Timestamp.now() as any,
          }
        ],
        activeGoals: [],
        weeklyEmissionsKg: 9.6,
        previousWeekEmissionsKg: 0,
        trend: 'stable' as const,
        carbonScore: 80,
        conversationHistory: [],
        previousRecommendations: [],
      }

      const recs = recommendationEngine.generateRecommendations(context)
      const meatRec = recs.find(r => r.title.includes('Replace red meat'))
      
      expect(meatRec).toBeDefined()
      expect(meatRec?.observation).toContain('red meat')
      expect(meatRec?.reasoning).toContain('Red meat')
      expect(meatRec?.recommendation).toContain('Replace your logged red meat meals')
      expect(meatRec?.estimatedImpact).toContain('8.1 kg CO2') // 3 * 2.7 = 8.1
      expect(meatRec?.explanation).toContain('reductions')
      expect(meatRec?.explanation).toContain('8/10') // ease of implementation
    })
  })

  describe('RecommendationsRepository', () => {
    it('saves recommendation metadata and queries it back', async () => {
      const recData = {
        title: 'Choose walking or cycling for short trips',
        category: 'transport',
        priority: 'medium' as const,
        potentialSavingsKg: 2.8,
        easeOfImplementation: 7,
        userRelevance: 6,
        historicalBehaviorScore: 5,
        rankingScore: 5.8,
        confidenceScore: 0.7,
        explanation: 'Highly prioritized.',
        calculationDetails: 'Short trips',
        observation: 'Observation text',
        reasoning: 'Reasoning text',
        recommendation: 'Recommendation text',
        estimatedImpact: 'Impact text',
      }

      const id = await recommendationsRepository.save('user-xyz', recData)
      expect(id).toBeDefined()
      expect(id.startsWith('mock-rec-')).toBe(true)

      const history = await recommendationsRepository.findByUserId('user-xyz')
      expect(history.length).toBeGreaterThan(0)
      expect(history[0].title).toBe('Choose walking or cycling for short trips')
      expect(history[0].userId).toBe('user-xyz')
      expect(history[0].rankingScore).toBe(5.8)
    })

    it('findByUserIdWithXai returns ExplainableRecommendation contract shape', async () => {
      const recData = {
        title: 'Unplug phantom energy loads',
        category: 'energy',
        priority: 'medium' as const,
        potentialSavingsKg: 2.5,
        easeOfImplementation: 9,
        userRelevance: 6,
        historicalBehaviorScore: 4,
        rankingScore: 6.1,
        confidenceScore: 0.7,
        explanation: 'Highly achievable energy saving.',
        calculationDetails: '10.7 kWh * 0.233 = 2.5 kg CO2',
        observation: 'Standby power accumulates.',
        reasoning: 'Phantom loads draw power even when off.',
        recommendation: 'Use smart power strips.',
        estimatedImpact: 'Saves 2.5 kg CO2 per week.',
      }

      await recommendationsRepository.save('user-xai-test', recData)
      const xaiRecs = await recommendationsRepository.findByUserIdWithXai('user-xai-test', 5)

      expect(xaiRecs.length).toBeGreaterThan(0)

      const xai = xaiRecs[0]

      // Must have all 6 core XAI fields
      expect(xai.observation).toBeDefined()
      expect(xai.reasoning).toBeDefined()
      expect(xai.recommendation).toBeDefined()
      expect(xai.impact).toBeDefined() // mapped from estimatedImpact
      expect(typeof xai.confidence).toBe('number')
      expect(xai.priority).toBeDefined()

      // impact should be mapped correctly from estimatedImpact
      expect(xai.impact).toBe(recData.estimatedImpact)
      // confidence should be mapped from confidenceScore
      expect(xai.confidence).toBe(recData.confidenceScore)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // XAI LAYER TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Explainable AI (XAI) Layer', () => {
    const baseUser = {
      uid: 'user-xai',
      displayName: 'XAI Tester',
      email: 'xai@rootly.green',
      photoURL: null,
      carbonScore: 80,
      totalEmissionsKg: 100,
      weeklyGoalKg: 100,
      createdAt: Timestamp.now() as any,
      updatedAt: Timestamp.now() as any,
    }

    const baseContext = {
      user: baseUser,
      recentActivities: [],
      weeklyActivities: [
        {
          id: 'act-1',
          userId: 'user-xai',
          category: 'transport' as const,
          activity: 'car',
          quantity: 80,
          emission: 15.36,
          timestamp: Timestamp.now() as any,
        },
        {
          id: 'act-2',
          userId: 'user-xai',
          category: 'food' as const,
          activity: 'red_meat',
          quantity: 2,
          emission: 6.4,
          timestamp: Timestamp.now() as any,
        }
      ],
      activeGoals: [],
      weeklyEmissionsKg: 21.76,
      previousWeekEmissionsKg: 0,
      trend: 'stable' as const,
      carbonScore: 80,
      conversationHistory: [],
      previousRecommendations: [],
    }

    it('all engine recommendations pass the explainableRecommendationSchema', () => {
      const recs = recommendationEngine.generateRecommendations(baseContext)
      expect(recs.length).toBeGreaterThan(0)

      for (const rec of recs) {
        const xai = toExplainableRecommendation(rec)
        const result = explainableRecommendationSchema.safeParse(xai)
        expect(result.success).toBe(true),
          `Recommendation "${rec.title}" failed schema validation: ${
            result.success ? '' : JSON.stringify(result.error.flatten())
          }`
      }
    })

    it('toExplainableRecommendation maps all 6 core XAI fields correctly', () => {
      const recs = recommendationEngine.generateRecommendations(baseContext)
      const topRec = recs[0]
      const xai = toExplainableRecommendation(topRec)

      // The 6 required XAI fields
      expect(typeof xai.observation).toBe('string')
      expect(xai.observation.length).toBeGreaterThan(0)

      expect(typeof xai.reasoning).toBe('string')
      expect(xai.reasoning.length).toBeGreaterThan(0)

      expect(typeof xai.recommendation).toBe('string')
      expect(xai.recommendation.length).toBeGreaterThan(0)

      expect(typeof xai.impact).toBe('string')
      expect(xai.impact.length).toBeGreaterThan(0)
      // impact maps from estimatedImpact
      expect(xai.impact).toBe(topRec.estimatedImpact)

      expect(typeof xai.confidence).toBe('number')
      expect(xai.confidence).toBe(topRec.confidenceScore)

      expect(['high', 'medium', 'low']).toContain(xai.priority)
      expect(xai.priority).toBe(topRec.priority)
    })

    it('confidence score is always in the range [0, 1]', () => {
      const recs = recommendationEngine.generateRecommendations(baseContext)
      for (const rec of recs) {
        const xai = toExplainableRecommendation(rec)
        expect(xai.confidence).toBeGreaterThanOrEqual(0)
        expect(xai.confidence).toBeLessThanOrEqual(1)
      }
    })

    it('priority is always one of: high | medium | low', () => {
      const recs = recommendationEngine.generateRecommendations(baseContext)
      const validPriorities = new Set(['high', 'medium', 'low'])
      for (const rec of recs) {
        const xai = toExplainableRecommendation(rec)
        expect(validPriorities.has(xai.priority)).toBe(true)
      }
    })

    it('toExplainableRecommendation includes full audit metadata', () => {
      const recs = recommendationEngine.generateRecommendations(baseContext)
      const topRec = recs[0]
      const now = new Date().toISOString()
      const xai = toExplainableRecommendation(topRec, now)

      expect(xai.title).toBe(topRec.title)
      expect(xai.category).toBe(topRec.category)
      expect(xai.potentialSavingsKg).toBe(topRec.potentialSavingsKg)
      expect(xai.explanation).toBe(topRec.explanation)
      expect(xai.calculationDetails).toBe(topRec.calculationDetails)
      expect(xai.rankingScore).toBe(topRec.rankingScore)
      expect(xai.generatedAt).toBe(now)
    })

    it('isExplainableRecommendation type guard returns true for valid XAI objects', () => {
      const recs = recommendationEngine.generateRecommendations(baseContext)
      const xai = toExplainableRecommendation(recs[0])
      expect(isExplainableRecommendation(xai)).toBe(true)
    })

    it('isExplainableRecommendation returns false for malformed data', () => {
      expect(isExplainableRecommendation(null)).toBe(false)
      expect(isExplainableRecommendation({})).toBe(false)
      expect(isExplainableRecommendation({ observation: 'ok' })).toBe(false)
      // confidence out of range
      expect(isExplainableRecommendation({
        observation: 'obs', reasoning: 'rea', recommendation: 'rec',
        impact: 'imp', confidence: 1.5, priority: 'high',
        title: 't', category: 'transport', potentialSavingsKg: 1,
        explanation: 'e', calculationDetails: 'c', rankingScore: 5,
        generatedAt: new Date().toISOString(),
      })).toBe(false)
      // invalid priority
      expect(isExplainableRecommendation({
        observation: 'obs', reasoning: 'rea', recommendation: 'rec',
        impact: 'imp', confidence: 0.8, priority: 'critical',
        title: 't', category: 'transport', potentialSavingsKg: 1,
        explanation: 'e', calculationDetails: 'c', rankingScore: 5,
        generatedAt: new Date().toISOString(),
      })).toBe(false)
    })

    it('parseExplainableRecommendation returns null for invalid data and parsed object for valid data', () => {
      const recs = recommendationEngine.generateRecommendations(baseContext)
      const validXai = toExplainableRecommendation(recs[0])

      // Valid data
      const parsed = parseExplainableRecommendation(validXai)
      expect(parsed).not.toBeNull()
      expect(parsed?.observation).toBe(validXai.observation)

      // Invalid data
      expect(parseExplainableRecommendation(null)).toBeNull()
      expect(parseExplainableRecommendation({ confidence: 99 })).toBeNull()
    })

    it('XAI schema rejects missing required fields', () => {
      const incomplete = {
        observation: 'Some observation',
        reasoning: 'Some reasoning',
        // missing: recommendation, impact, confidence, priority, and audit fields
      }
      const result = explainableRecommendationSchema.safeParse(incomplete)
      expect(result.success).toBe(false)
      if (!result.success) {
        const fields = result.error.flatten().fieldErrors
        expect(fields).toHaveProperty('recommendation')
        expect(fields).toHaveProperty('impact')
        expect(fields).toHaveProperty('confidence')
        expect(fields).toHaveProperty('priority')
      }
    })

    it('XAI schema rejects confidence values outside [0, 1]', () => {
      const base = {
        observation: 'obs', reasoning: 'rea', recommendation: 'rec',
        impact: 'imp', priority: 'high',
        title: 't', category: 'energy', potentialSavingsKg: 2.5,
        explanation: 'e', calculationDetails: 'c', rankingScore: 5,
        generatedAt: new Date().toISOString(),
      }
      expect(explainableRecommendationSchema.safeParse({ ...base, confidence: -0.1 }).success).toBe(false)
      expect(explainableRecommendationSchema.safeParse({ ...base, confidence: 1.01 }).success).toBe(false)
      expect(explainableRecommendationSchema.safeParse({ ...base, confidence: 0 }).success).toBe(true)
      expect(explainableRecommendationSchema.safeParse({ ...base, confidence: 1 }).success).toBe(true)
      expect(explainableRecommendationSchema.safeParse({ ...base, confidence: 0.75 }).success).toBe(true)
    })

    it('potentialSavingsKg is always a non-negative number in XAI output', () => {
      const recs = recommendationEngine.generateRecommendations(baseContext)
      for (const rec of recs) {
        const xai = toExplainableRecommendation(rec)
        expect(xai.potentialSavingsKg).toBeGreaterThanOrEqual(0)
      }
    })

    it('XAI output matches the required JSON contract shape exactly', () => {
      const recs = recommendationEngine.generateRecommendations(baseContext)
      const xai = toExplainableRecommendation(recs[0])

      // Validate the minimal 6-field public contract is present
      const minimalContract = {
        observation: xai.observation,
        reasoning: xai.reasoning,
        recommendation: xai.recommendation,
        impact: xai.impact,
        confidence: xai.confidence,
        priority: xai.priority,
      }

      // All 6 fields must be truthy / valid types
      expect(minimalContract.observation).toBeTruthy()
      expect(minimalContract.reasoning).toBeTruthy()
      expect(minimalContract.recommendation).toBeTruthy()
      expect(minimalContract.impact).toBeTruthy()
      expect(typeof minimalContract.confidence).toBe('number')
      expect(['high', 'medium', 'low']).toContain(minimalContract.priority)

      // The schema should accept this exact shape
      expect(explainableRecommendationSchema.safeParse(xai).success).toBe(true)
    })
  })
})
