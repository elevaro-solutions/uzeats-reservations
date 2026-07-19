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
