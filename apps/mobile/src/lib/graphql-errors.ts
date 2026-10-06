import { ApolloError } from "@apollo/client";

export interface ValidationIssue {
  path: (string | number)[];
  message: string;
}

function getGraphQLErrorExtensions(error: unknown) {
  if (error instanceof ApolloError) {
    return error.graphQLErrors ?? [];
  }
  return [];
}

export function getValidationIssues(error: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const gqlError of getGraphQLErrorExtensions(error)) {
    const ext = gqlError.extensions;
    if (ext?.code === "VALIDATION_ERROR" && Array.isArray(ext.issues)) {
      issues.push(...ext.issues);
    }
  }
  return issues;
}

export function getGraphQLErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (error instanceof ApolloError) {
    return error.graphQLErrors[0]?.message ?? error.message ?? fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function getGraphQLErrorCode(error: unknown): string | undefined {
  for (const gqlError of getGraphQLErrorExtensions(error)) {
    const code = gqlError.extensions?.code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

export function isUnauthenticatedError(error: unknown): boolean {
  if (getGraphQLErrorCode(error) === "UNAUTHENTICATED") return true;
  if (error instanceof ApolloError) {
    return (
      error.graphQLErrors.some(
        (e) =>
          e.extensions?.code === "UNAUTHENTICATED" ||
          e.message === "Authentication required",
      ) || error.message === "Authentication required"
    );
  }
  return false;
}

export function toFieldErrors(
  issues: ValidationIssue[],
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[issue.path.length - 1] ?? "");
    if (key && !(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/**
 * Field-related GraphQL errors (`extensions.field` / Zod issues), with message
 * heuristics for older CONFLICT responses that only returned a code.
 */
export function getGraphQLFieldErrors(error: unknown): Record<string, string> {
  const fromIssues = toFieldErrors(getValidationIssues(error));
  if (Object.keys(fromIssues).length > 0) return fromIssues;

  const message = getGraphQLErrorMessage(error, "");
  if (!message) return {};

  let field: string | undefined;
  for (const gqlError of getGraphQLErrorExtensions(error)) {
    const ext = gqlError.extensions as { field?: unknown } | undefined;
    if (typeof ext?.field === "string" && ext.field) {
      field = ext.field;
      break;
    }
  }

  if (!field) {
    if (/email already registered/i.test(message)) field = "email";
    else if (/account already exists with this email/i.test(message)) field = "email";
    else if (/invalid referral code/i.test(message)) field = "referralCode";
    else if (/invalid credentials/i.test(message)) field = "password";
    else if (/uses google sign-in/i.test(message)) field = "email";
  }

  if (!field) return {};

  const display = /email already registered/i.test(message)
    ? "This email is already registered. Sign in or use a different email."
    : message;

  return { [field]: display };
}
