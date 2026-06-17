export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded. Please wait a moment.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED')
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR')
  }
}
