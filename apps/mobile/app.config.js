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
  icon: "./assets/icon.png",
  scheme: "tablevera",
  userInterfaceStyle: "light",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.tablevera.app",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Tablevera uses your location to show restaurants near you.",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0b3d2e",
    },
    package: "com.tablevera.app",
    permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"],
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-dev-client",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#0b3d2e",
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
      "@react-native-google-signin/google-signin",
      {
        iosUrlScheme: iosUrlSchemeFromClientId(IOS_CLIENT_ID),
      },
    ],
    "@react-native-community/datetimepicker",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: "070424ea-6261-4776-9d32-95dd85fd0e6b",
    },
  },
  owner: "xondamir",
};

module.exports = config;
