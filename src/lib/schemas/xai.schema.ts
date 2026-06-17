/**
 * XAI (Explainable AI) Zod Schemas
 *
 * Single source of truth for all Explainable AI response validation.
 * Used by:
 *   - Backend: API response validation before returning to client
 *   - Frontend: Runtime type-narrowing of API payloads
 *   - Tests: Schema compliance assertions
 *
 * The canonical 6-field XAI contract:
 * { observation, reasoning, recommendation, impact, confidence, priority }
 */

import { z } from 'zod'

// ─── Core XAI Schema ───────────────────────────────────────────────────────────

export const recommendationPrioritySchema = z.enum(['high', 'medium', 'low'])

/**
 * The minimal public XAI contract — the 6 fields every AI recommendation MUST expose.
 * Matches ExplainableRecommendation in src/types/recommendation.ts.
 */
export const explainableRecommendationSchema = z.object({
  // ── Core XAI 6-field contract ──────────────────────────────────────────────
  observation: z.string().min(1, 'Observation is required'),
  reasoning: z.string().min(1, 'Reasoning is required'),
  recommendation: z.string().min(1, 'Recommendation is required'),
  impact: z.string().min(1, 'Estimated impact is required'),
  confidence: z
    .number()
    .min(0, 'Confidence must be ≥ 0')
    .max(1, 'Confidence must be ≤ 1'),
  priority: recommendationPrioritySchema,

  // ── Audit & traceability metadata ─────────────────────────────────────────
  title: z.string().min(1),
  category: z.string().min(1),
  potentialSavingsKg: z.number().min(0),
  explanation: z.string().min(1),
  calculationDetails: z.string(),
  rankingScore: z.number(),
  generatedAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
})

export type ExplainableRecommendationSchema = z.infer<
  typeof explainableRecommendationSchema
>

// ─── Chat API Response Schema ──────────────────────────────────────────────────

/**
 * Full shape of the /api/chat POST response.
 * xpiExplanation is optional — only present when the engine generated a ranked recommendation.
 */
export const chatApiResponseSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().min(1),
  xpiExplanation: explainableRecommendationSchema.optional(),
})

export type ChatApiResponseSchema = z.infer<typeof chatApiResponseSchema>

// ─── Recommendations History API Schema ───────────────────────────────────────

/**
 * Query parameters for GET /api/recommendations
 */
export const recommendationHistoryQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 10))
    .pipe(z.number().int().min(1).max(50)),
})

export type RecommendationHistoryQuery = z.infer<
  typeof recommendationHistoryQuerySchema
>

/**
 * GET /api/recommendations response shape
 */
export const recommendationHistoryResponseSchema = z.object({
  recommendations: z.array(explainableRecommendationSchema),
  total: z.number().int().min(0),
  generatedAt: z.string(),
})

export type RecommendationHistoryResponse = z.infer<
  typeof recommendationHistoryResponseSchema
>

// ─── Guard Utilities ──────────────────────────────────────────────────────────

/**
 * Runtime type guard — narrows an unknown value to ExplainableRecommendation.
 * Safe for use in frontend code after fetch() calls.
 */
export function isExplainableRecommendation(
  value: unknown
): value is ExplainableRecommendationSchema {
  return explainableRecommendationSchema.safeParse(value).success
}

/**
 * Safe parse with a typed result — returns null on failure instead of throwing.
 */
export function parseExplainableRecommendation(
  value: unknown
): ExplainableRecommendationSchema | null {
  const result = explainableRecommendationSchema.safeParse(value)
  return result.success ? result.data : null
}
