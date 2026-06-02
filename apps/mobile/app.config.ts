import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Core",
  slug: "core",
  scheme: "core",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "dark",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "cover",
    backgroundColor: "#050507",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.harperlinks.core",
    infoPlist: {
      NSCameraUsageDescription:
        "Life-OS uses the camera to scan your food, body, and outfits.",
      NSMicrophoneUsageDescription:
        "Life-OS uses the microphone for voice journaling and coach conversations.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.harperlinks.core",
    adaptiveIcon: {
      foregroundImage: "./assets/images/icon-foreground.png",
      backgroundColor: "#050507",
    },
    edgeToEdgeEnabled: true,
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-camera",
    "expo-notifications",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#050507",
        image: "./assets/images/splash.png",
        resizeMode: "cover",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: "REPLACE_WITH_EAS_PROJECT_ID",
    },
  },
});
