import { z } from 'zod'
import { ValidationError } from '../errors/AppError'

export function validateBody<T>(schema: z.Schema<T>, body: unknown): T {
  const result = schema.safeParse(body)
  if (!result.success) {
    const errorDetails = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    throw new ValidationError(errorDetails)
  }
  return result.data
}
