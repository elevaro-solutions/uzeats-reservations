const IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ??
  "836445078330-j87pdsm3gu6bn3fphqomb4r8j68egfp2.apps.googleusercontent.com";

/** Reversed iOS OAuth client ID for Google Sign-In URL scheme. */
function iosUrlSchemeFromClientId(clientId) {
  const id = clientId.replace(/\.apps\.googleusercontent\.com$/, "");
  return `com.googleusercontent.apps.${id}`;
}

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: "Tablevera",
  slug: "tablevera",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/android-app-icon/android-icon-foreground.png",
  scheme: "tablevera",
  userInterfaceStyle: "light",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "uz.alitech.tablevera",
    icon: "./assets/ios-app-icon.icon",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Tablevera uses your location to show restaurants near you.",
      NSPhotoLibraryUsageDescription:
        "Tablevera lets you attach photos to your restaurant reviews.",
      // Standard HTTPS / TLS only — no non-exempt encryption algorithms.
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/android-app-icon/android-icon-foreground.png",
      monochromeImage: "./assets/android-app-icon/android-icon-monochrome.png",
      backgroundColor: "#000000",
    },
    package: "uz.alitech.tablevera",
    googleServicesFile: "./google-services.json",
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "READ_MEDIA_IMAGES",
    ],
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-dev-client",
    [
      "expo-image-picker",
      {
        photosPermission:
          "Tablevera lets you attach photos to your restaurant reviews.",
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        android: {
          image: "./assets/android-app-icon/android-icon-foreground.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      },
    ],
    "expo-font",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Tablevera uses your location to show restaurants near you.",
      },
    ],
    [
      "expo-calendar",
      {
        calendarPermission:
          "Tablevera adds your reservation to your calendar.",
        writeOnlyCalendarPermission:
          "Tablevera adds your reservation to your calendar.",
        writeOnlyAccess: true,
      },
    ],
    [
      "@react-native-google-signin/google-signin",
      {
        iosUrlScheme: iosUrlSchemeFromClientId(IOS_CLIENT_ID),
      },
    ],
    [
      "@react-native-community/datetimepicker",
    ],
    [
      "@stripe/stripe-react-native",
      {
        "merchantIdentifier": "merchant.com.tablevera.app",
        "enableGooglePay": true,
      },
    ],
    [
      "expo-notifications",
      {
        color: "#0b3d2e",
        defaultChannel: "default",
        // Shown in the iOS permission prompt when requesting push access.
        sounds: [],
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: "16386e83-34eb-4a95-8c46-2ec3c9b6d423",
    },
  },
  owner: "xondamir",
};

module.exports = config;
