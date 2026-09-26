import * as SecureStore from "expo-secure-store";

import { API_URL } from "./config";

export type AuthTokenPair = {
  accessToken: string;
  refreshToken: string;
};

export class TokenRefreshError extends Error {
  readonly reason: "invalid" | "network";

  constructor(message: string, reason: "invalid" | "network") {
    super(message);
    this.name = "TokenRefreshError";
    this.reason = reason;
  }
}

const REFRESH_MUTATION = `mutation refreshToken($refreshToken: String!) {
  refreshToken(refreshToken: $refreshToken) {
    accessToken
    refreshToken
    user { id }
  }
}`;

/** Exchange the stored refresh token for a new pair and persist both. */
export async function refreshSessionTokens(): Promise<AuthTokenPair> {
  const refreshToken = await SecureStore.getItemAsync("refreshToken");
  if (!refreshToken) {
    throw new TokenRefreshError("No refresh token", "invalid");
  }

  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: REFRESH_MUTATION,
        variables: { refreshToken },
      }),
    });
  } catch {
    throw new TokenRefreshError("Network error during refresh", "network");
  }

  let result: {
    data?: { refreshToken?: AuthTokenPair | null };
    errors?: Array<{ message?: string }>;
  };
  try {
    result = await res.json();
  } catch {
    throw new TokenRefreshError("Invalid refresh response", "network");
  }

  if (!res.ok || result.errors?.length) {
    throw new TokenRefreshError(
      result.errors?.[0]?.message ?? "Refresh failed",
      "invalid",
    );
  }

  const data = result.data?.refreshToken;
  if (!data?.accessToken || !data?.refreshToken) {
    throw new TokenRefreshError("Refresh failed", "invalid");
  }

  await SecureStore.setItemAsync("accessToken", data.accessToken);
  await SecureStore.setItemAsync("refreshToken", data.refreshToken);
  return data;
}

export function isUnauthenticatedGraphQLError(error: {
  message?: string;
  extensions?: Record<string, unknown>;
}): boolean {
  if (error.extensions?.code === "UNAUTHENTICATED") return true;
  return error.message === "Authentication required";
}
