import { getGraphQLErrorMessage } from "@/lib/graphql-errors";

export function getAuthErrorMessage(err: unknown, fallback: string): string {
  const raw = getGraphQLErrorMessage(err, fallback);
  if (/email already registered/i.test(raw)) {
    return "This email is already registered. Sign in or use a different email.";
  }
  return raw;
}
