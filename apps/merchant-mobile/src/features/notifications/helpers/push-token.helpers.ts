import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { UnistylesRuntime } from "react-native-unistyles";

import { API_URL } from "@/graphql/config";

export type PushPlatform = "ios" | "android";

export type PushPermissionStatus = "undetermined" | "granted" | "denied";

function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId
  );
}

export function getPushPlatform(): PushPlatform | null {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return null;
}

export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: UnistylesRuntime.getTheme().colors.primary,
  });
}

async function fetchExpoPushToken(
  platform: PushPlatform,
): Promise<{ token: string; platform: PushPlatform } | null> {
  const projectId = getProjectId();
  if (!projectId) {
    console.warn("[push] EAS projectId missing; cannot fetch Expo push token");
    return null;
  }

  try {
    const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token: pushToken.data, platform };
  } catch (err) {
    console.warn("[push] getExpoPushTokenAsync failed", err);
    return null;
  }
}

/**
 * Returns an Expo push token only when permission is already granted.
 * Never shows the OS permission dialog.
 */
export async function getExpoPushTokenIfGranted(): Promise<{
  token: string;
  platform: PushPlatform;
} | null> {
  const platform = getPushPlatform();
  if (!platform) return null;

  await ensureAndroidChannel();

  const status = await getPushPermissionStatus();
  if (status !== "granted") return null;

  return fetchExpoPushToken(platform);
}

/**
 * Requests notification permission (if needed) and returns an Expo push token.
 * Returns null when permission is denied, platform is unsupported, or token fetch fails.
 */
export async function registerForPushNotificationsAsync(): Promise<{
  token: string;
  platform: PushPlatform;
} | null> {
  const platform = getPushPlatform();
  if (!platform) return null;

  await ensureAndroidChannel();

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;
  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  return fetchExpoPushToken(platform);
}

const UNREGISTER_PUSH_TOKEN_MUTATION = `
  mutation UnregisterPushToken($token: String!) {
    unregisterPushToken(token: $token)
  }
`;

/**
 * Best-effort: drop this device token from the API so pushes stop after
 * sign-out. Never prompts for permission. Failures are logged, not thrown.
 */
export async function unregisterCurrentDevicePushTokenBestEffort(): Promise<void> {
  try {
    const result = await getExpoPushTokenIfGranted();
    if (!result) return;

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: UNREGISTER_PUSH_TOKEN_MUTATION,
        variables: { token: result.token },
      }),
    });
    if (!res.ok) {
      console.warn("[push] unregister HTTP", res.status);
    }
  } catch (err) {
    console.warn("[push] unregister failed", err);
  }
}
