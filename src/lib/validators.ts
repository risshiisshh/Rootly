import { z } from 'zod'

export const createActivitySchema = z.object({
  category: z.enum(['transport', 'food', 'energy', 'lifestyle', 'other']),
  activity: z.string().min(1, 'Activity subtype is required').max(200),
  quantity: z.number().min(0, 'Quantity cannot be negative'),
  emission: z.number().min(0, 'Emission cannot be negative'),
  description: z.string().max(1000).optional().default(''),
})

export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(4000, 'Message too long'),
  conversationId: z.string().optional(),
})

export const routeRequestSchema = z.object({
  origin: z.string().min(2, 'Origin is required').max(500),
  destination: z.string().min(2, 'Destination is required').max(500),
})

export const createGoalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional().default(''),
  category: z.enum(['transport', 'food', 'energy', 'lifestyle', 'other']),
  targetReductionKg: z.number().min(0.1, 'Target must be at least 0.1 kg').max(10000),
  deadline: z.coerce.date().min(new Date(), 'Deadline must be in the future'),
})

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const signUpSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  weeklyGoalKg: z.number().min(1).max(1000).default(100),
})

export type CreateActivityInput = z.infer<typeof createActivitySchema>
export type ChatMessageInput = z.infer<typeof chatMessageSchema>
export type RouteRequestInput = z.infer<typeof routeRequestSchema>
export type CreateGoalInput = z.infer<typeof createGoalSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.infer<typeof signUpSchema>

/**
 * Detects potential prompt injection attacks in user-controlled inputs.
 * Uses specific heuristic patterns targeting common injection techniques
 * (e.g. system override instructions, jailbreak attempts, command injection).
 */
export function detectPromptInjection(input: string): boolean {
  const normalized = input.toLowerCase().trim()
  
  const injectionPatterns = [
    // Ignore instructions / override instructions
    /\bignore\s+(?:all\s+)?(?:previous|prior)\s+(?:instructions|prompts|rules|orders)\b/i,
    /\byou\s+are\s+now\s+(?:a|an)\s+(?:unrestricted|different|new)\b/i,
    /\bforget\s+(?:all\s+)?(?:previous|prior)\s+(?:instructions|prompts|rules|orders)\b/i,
    // System instruction override
    /\bsystem\s+(?:instructions|prompt|rules|override)\b/i,
    /\bnew\s+role\b/i,
    /\bdeveloper\s+mode\b/i,
    // Prompt leakage
    /\breveal\s+(?:your\s+)?(?:system\s+)?(?:prompt|instructions|rules)\b/i,
    /\boutput\s+the\s+above\s+text\b/i,
    /\bwhat\s+is\s+written\s+above\b/i,
    // Output control injection
    /\bdo\s+not\s+output\s+json\b/i,
    /\boutput\s+strictly\s+text\b/i,
  ]

  return injectionPatterns.some(pattern => pattern.test(normalized))
}

/**
 * Sanitizes displayName inputs to remove potentially malicious control characters
 * that could be used for LLM instruction framing/interpolation injection.
 */
export function sanitizeDisplayName(name: string): string {
  // Strip control chars, quotes, brackets, braces, and line breaks
  return name.replace(/[\r\n\t"'`<>\[\]\{\}]/g, '').trim()
}

