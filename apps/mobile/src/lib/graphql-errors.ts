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
