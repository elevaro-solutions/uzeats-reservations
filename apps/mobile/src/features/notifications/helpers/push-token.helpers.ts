import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { UnistylesRuntime } from "react-native-unistyles";

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
