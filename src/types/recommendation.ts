import { Timestamp } from 'firebase/firestore'

export type RecommendationPriority = 'high' | 'medium' | 'low'

export interface Recommendation {
  id: string
  userId: string
  title: string
  category: string
  priority: RecommendationPriority
  observation: string
  reasoning: string
  recommendation: string
  estimatedImpact: string
  
  // Metadata for ranking and verification
  potentialSavingsKg: number
  easeOfImplementation: number // 1 to 10
  userRelevance: number // 1 to 10
  historicalBehaviorScore: number // 1 to 10
  rankingScore: number // Calculated overall ranking score
  confidenceScore: number // Confidence score 0 to 1
  explanation: string // Explanation layer (why prioritized)
  
  calculationDetails: string
  createdAt: Timestamp
}

/**
 * ExplainableRecommendation — the public XAI contract.
 * 
 * This is the canonical shape exposed via API responses, frontend components,
 * and Firestore queries. It maps the internal `Recommendation` engine output
 * to a clean, stable interface with 6 core explainability fields:
 *   observation, reasoning, recommendation, impact, confidence, priority
 * 
 * Matches the JSON contract:
 * {
 *   observation: "…",
 *   reasoning: "…",
 *   recommendation: "…",
 *   impact: "…",
 *   confidence: 0.92,
 *   priority: "high"
 * }
 */
export interface ExplainableRecommendation {
  // Core XAI 6-field contract
  observation: string
  reasoning: string
  recommendation: string
  impact: string        // renamed from estimatedImpact for clean API surface
  confidence: number    // 0.0–1.0 — reflects data completeness and alignment
  priority: RecommendationPriority

  // Audit & traceability metadata
  title: string
  category: string
  potentialSavingsKg: number
  explanation: string         // human-readable "why this recommendation was prioritized"
  calculationDetails: string  // raw calculation string for full auditability
  rankingScore: number        // weighted composite score used to rank this recommendation
  generatedAt: string         // ISO 8601 timestamp — when the recommendation was produced
}

/**
 * Maps an internal Recommendation engine object to the public ExplainableRecommendation contract.
 * Use this at API boundaries (controller/service) to ensure type safety.
 */
export function toExplainableRecommendation(
  rec: Recommendation,
  generatedAt?: string
): ExplainableRecommendation {
  return {
    observation: rec.observation,
    reasoning: rec.reasoning,
    recommendation: rec.recommendation,
    impact: rec.estimatedImpact,
    confidence: rec.confidenceScore,
    priority: rec.priority,
    title: rec.title,
    category: rec.category,
    potentialSavingsKg: rec.potentialSavingsKg,
    explanation: rec.explanation,
    calculationDetails: rec.calculationDetails,
    rankingScore: rec.rankingScore,
    generatedAt: generatedAt ?? new Date().toISOString(),
  }
}
