import { CombinedGraphQLErrors } from '@apollo/client';

export interface ValidationIssue {
  /** Zod-style path relative to the mutation input, e.g. ["guestNotes"]. */
  path: (string | number)[];
  message: string;
}

/**
 * Pulls Zod validation issues out of a GraphQL error thrown by Apollo.
 * The API's `formatError` emits `{ code: 'VALIDATION_ERROR', issues: [...] }`
 * in the error extensions (see apps/api/src/index.ts).
 */
export function getValidationIssues(error: unknown): ValidationIssue[] {
  if (!CombinedGraphQLErrors.is(error)) return [];

  const issues: ValidationIssue[] = [];
  for (const gqlError of error.errors) {
    const ext = gqlError.extensions as
      | { code?: string; issues?: ValidationIssue[] }
      | undefined;
    if (ext?.code === 'VALIDATION_ERROR' && Array.isArray(ext.issues)) {
      issues.push(...ext.issues);
    }
  }
  return issues;
}

/** First GraphQL error message, or a fallback for non-GraphQL failures. */
export function getGraphQLErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors[0]?.message || error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/**
 * Maps validation issues to `{ fieldName: message }`, keyed by the last path
 * segment (the input field name). The first message per field wins.
 */
export function toFieldErrors(issues: ValidationIssue[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[issue.path.length - 1] ?? '');
    if (key && !(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/**
 * Field-related GraphQL errors (Conflict / Validation / Auth with `extensions.field`,
 * or Zod `issues`). Falls back to message heuristics for older API responses.
 */
export function getGraphQLFieldErrors(error: unknown): Record<string, string> {
  const fromIssues = toFieldErrors(getValidationIssues(error));
  if (Object.keys(fromIssues).length > 0) return fromIssues;

  const message = getGraphQLErrorMessage(error, '');
  if (!message) return {};

  let field: string | undefined;
  if (CombinedGraphQLErrors.is(error)) {
    const ext = error.errors[0]?.extensions as { field?: unknown } | undefined;
    if (typeof ext?.field === 'string' && ext.field) field = ext.field;
  }

  if (!field) {
    if (/email already registered/i.test(message)) field = 'email';
    else if (/account already exists with this email/i.test(message)) field = 'email';
    else if (/invalid referral code/i.test(message)) field = 'referralCode';
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
