import { NextResponse } from 'next/server'
import { AppError } from './AppError'
import { logger } from '../lib/logger'

export function errorHandler(error: unknown) {
  if (error instanceof AppError) {
    logger.warn(`AppError [${error.code}] (${error.statusCode}): ${error.message}`)
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    )
  }

  const message = error instanceof Error ? error.message : 'An unexpected error occurred'
  logger.error(`Unhandled Error: ${message}`, error instanceof Error ? error.stack : undefined)

  return NextResponse.json(
    {
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    },
    { status: 500 }
  )
}

export function catchAsync(handler: (...args: any[]) => Promise<NextResponse>) {
  return async (...args: any[]): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return errorHandler(error)
    }
  }
}
