export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHENTICATED', 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class PlanFeatureError extends AppError {
  constructor(message: string) {
    super(message, 'PLAN_FEATURE_REQUIRED', 403);
    this.name = 'PlanFeatureError';
  }
}

export function formatMongooseError(err: unknown): AppError | null {
  if (!err || typeof err !== 'object') return null;
  const name = (err as { name?: string }).name;
  if (name === 'ValidationError') {
    const message =
      Object.values((err as { errors?: Record<string, { message?: string }> }).errors ?? {})
        .map((e) => e.message)
        .filter(Boolean)
        .join('; ') || 'Validation failed';
    return new ValidationError(message);
  }
  if (name === 'CastError') {
    return new ValidationError('Invalid ID or field value');
  }
  return null;
}
