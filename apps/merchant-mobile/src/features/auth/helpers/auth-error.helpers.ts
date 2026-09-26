export function getAuthErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object") {
    const withGraphQL = err as {
      graphQLErrors?: Array<{ message?: string }>;
      message?: string;
    };
    const gqlMessage = withGraphQL.graphQLErrors?.[0]?.message;
    if (gqlMessage) return gqlMessage;
    if (typeof withGraphQL.message === "string" && withGraphQL.message) {
      return withGraphQL.message;
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
