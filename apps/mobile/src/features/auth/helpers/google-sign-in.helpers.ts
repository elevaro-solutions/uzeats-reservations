import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { Platform } from "react-native";

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";

let configured = false;

export function isGoogleSignInConfigured(): boolean {
  if (!WEB_CLIENT_ID) return false;
  if (Platform.OS === "ios" && !IOS_CLIENT_ID) return false;
  return true;
}

export function configureGoogleSignIn() {
  if (configured || !isGoogleSignInConfigured()) return;
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    iosClientId: Platform.OS === "ios" ? IOS_CLIENT_ID : undefined,
    offlineAccess: false,
  });
  configured = true;
}

export async function getGoogleIdToken(): Promise<string> {
  configureGoogleSignIn();
  if (!isGoogleSignInConfigured()) {
    throw new Error("Google Sign-In is not configured");
  }

  if (Platform.OS === "android") {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  const result = await GoogleSignin.signIn();

  if (result.type === "cancelled") {
    throw new Error("Google sign-in was cancelled");
  }

  const idToken = result.data?.idToken;
  if (!idToken) {
    const tokens = await GoogleSignin.getTokens();
    if (!tokens.idToken) {
      throw new Error("Google did not return an ID token");
    }
    return tokens.idToken;
  }

  return idToken;
}
