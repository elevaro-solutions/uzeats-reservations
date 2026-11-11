export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', details?: Record<string, unknown>) {
    super(message, 'UNAUTHENTICATED', 401, details);
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
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT', 409, details);
  }
}

export class PlanFeatureError extends AppError {
  constructor(message: string) {
    super(message, 'PLAN_FEATURE_REQUIRED', 403);
    this.name = 'PlanFeatureError';
  }
}

function duplicateKeyField(err: object): string | undefined {
  const keyPattern = (err as { keyPattern?: Record<string, unknown> }).keyPattern;
  if (keyPattern && typeof keyPattern === 'object') {
    const key = Object.keys(keyPattern)[0];
    if (key) return key;
  }
  const message = (err as { message?: string }).message ?? '';
  const indexed = message.match(/index:\s+([A-Za-z0-9_.]+)/);
  return indexed?.[1];
}

/** User-facing copy for a unique-index collision. Do not include the stored value. */
export function duplicateKeyMessage(field: string | undefined): string {
  const key = (field ?? '').toLowerCase();
  if (key.includes('phone')) return 'Phone already in use';
  if (key.includes('email')) return 'Email already registered';
  if (key.includes('slug')) return 'That URL slug is already in use';
  return 'That value is already in use';
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
  const code = (err as { code?: number }).code;
  const message = (err as { message?: string }).message ?? '';
  if (code === 11000 || (name === 'MongoServerError' && message.includes('E11000'))) {
    return new ConflictError(duplicateKeyMessage(duplicateKeyField(err)));
  }
  return null;
}

/**
 * GraphQL scalar coercion fails before the resolver, so production `formatError`
 * would otherwise hide it as an internal error.
 */
export function formatGraphqlInputMessage(message: string | undefined): string | null {
  if (!message) return null;
  const intOverflow = message.match(
    /Int cannot represent non 32-bit signed integer value: (-?\d+)/,
  );
  if (intOverflow) {
    return `A number in this form is too large (${intOverflow[1]}). Use a smaller amount.`;
  }
  const nonInteger = message.match(
    /^Variable "\$\w+" got invalid value .*? at "([\w.]+)"; Int cannot represent non-integer value/,
  );
  if (nonInteger) {
    return `Use a whole number for ${humanizeInputPath(nonInteger[1] ?? 'this field')}.`;
  }
  if (/Int cannot represent non-integer value/.test(message)) {
    return 'Use whole numbers only in this form.';
  }
  if (/^(Float|String|Boolean|ID) cannot represent /.test(message)) {
    return message;
  }
  return null;
}

function humanizeInputPath(path: string): string {
  const field = path.split('.').pop() ?? path;
  return field
    .replace(/Cents$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();
}
