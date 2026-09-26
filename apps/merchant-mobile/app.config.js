/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: "Tablevera Merchant",
  slug: "tablevera-merchant",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/android-app-icon/android-icon-foreground.png",
  scheme: "tablevera-merchant",
  userInterfaceStyle: "light",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "uz.alitech.tablevera.merchant",
    icon: "./assets/ios-app-icon.icon",
    infoPlist: {
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
    package: "uz.alitech.tablevera.merchant",
    googleServicesFile: "./google-services.json",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-dev-client",
    [
      "expo-splash-screen",
      {
        image: "./assets/android-app-icon/android-icon-foreground.png",
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
    ["@react-native-community/datetimepicker"],
    [
      "expo-notifications",
      {
        color: "#0b3d2e",
        defaultChannel: "default",
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
      projectId: "9df93ad5-d9cb-47d7-9d72-35513f8c81e3",
    },
  },
  owner: "xondamir",
};

module.exports = config;
