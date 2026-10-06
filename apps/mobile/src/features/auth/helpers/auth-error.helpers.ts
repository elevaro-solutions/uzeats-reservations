import {
  getGraphQLErrorMessage,
  getGraphQLFieldErrors,
} from "@/lib/graphql-errors";

export function getAuthErrorMessage(err: unknown, fallback: string): string {
  const raw = getGraphQLErrorMessage(err, fallback);
  if (/email already registered/i.test(raw)) {
    return "This email is already registered. Sign in or use a different email.";
  }
  if (/account already exists with this email/i.test(raw)) {
    return "An account already exists with this email. Sign in with email and password, then link Google from your profile.";
  }
  return raw;
}

const AUTH_FIELDS = ["email", "password", "fullName", "phone", "agreedToTerms"] as const;

type AuthField = (typeof AUTH_FIELDS)[number];

function isAuthField(name: string): name is AuthField {
  return (AUTH_FIELDS as readonly string[]).includes(name);
}

/** Apply field-scoped API errors via RHF `setError`. Returns true if any applied. */
export function applyAuthFieldErrors(
  err: unknown,
  setError: (name: AuthField, error: { type: string; message: string }) => void,
): boolean {
  const fieldErrors = getGraphQLFieldErrors(err);
  let applied = false;
  for (const [name, message] of Object.entries(fieldErrors)) {
    if (!isAuthField(name)) continue;
    setError(name, { type: "server", message });
    applied = true;
  }
  return applied;
}
