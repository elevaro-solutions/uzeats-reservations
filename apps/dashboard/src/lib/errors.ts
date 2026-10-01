import { CombinedGraphQLErrors } from '@apollo/client';

/** First GraphQL error message, or a fallback for non-GraphQL failures. */
export function getGraphQLErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors[0]?.message || error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/**
 * Field-related GraphQL errors (`extensions.field`) with message heuristics
 * for older API responses that only returned CONFLICT / UNAUTHENTICATED codes.
 */
export function getGraphQLFieldErrors(error: unknown): Record<string, string> {
  const message = getGraphQLErrorMessage(error, '');
  if (!message) return {};

  let field: string | undefined;
  if (CombinedGraphQLErrors.is(error)) {
    const ext = error.errors[0]?.extensions as { field?: unknown } | undefined;
    if (typeof ext?.field === 'string' && ext.field) field = ext.field;
  }

  if (!field) {
    if (/email already registered/i.test(message)) field = 'email';
    else if (/restaurant with this name already exists/i.test(message)) field = 'name';
    else if (/invalid credentials/i.test(message)) field = 'password';
    else if (/uses google sign-in/i.test(message)) field = 'email';
  }

  if (!field) return {};

  const display =
    /email already registered/i.test(message)
      ? 'This email is already registered. Sign in or use a different email.'
      : message;

  return { [field]: display };
}
