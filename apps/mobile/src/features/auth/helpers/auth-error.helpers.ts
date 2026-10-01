import {
  getGraphQLErrorMessage,
  getGraphQLFieldErrors,
} from "@/lib/graphql-errors";

export function getAuthErrorMessage(err: unknown, fallback: string): string {
  const raw = getGraphQLErrorMessage(err, fallback);
  if (/email already registered/i.test(raw)) {
    return "This email is already registered. Sign in or use a different email.";
  }
  return raw;
}

/** Apply field-scoped API errors via RHF `setError`. Returns true if any applied. */
export function applyAuthFieldErrors(
  err: unknown,
  setError: (name: "email" | "password" | "fullName" | "agreedToTerms", error: { type: string; message: string }) => void,
): boolean {
  const fieldErrors = getGraphQLFieldErrors(err);
  let applied = false;
  for (const [name, message] of Object.entries(fieldErrors)) {
    if (name === "email" || name === "password" || name === "fullName" || name === "agreedToTerms") {
      setError(name, { type: "server", message });
      applied = true;
    }
  }
  return applied;
}
