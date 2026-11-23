const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

// Expo detects the npm workspace and configures monorepo resolution automatically.
/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const nativewindConfig = withNativewind(config);
const resolveWithNativewind = nativewindConfig.resolver.resolveRequest;
const reactNativeEntry = require.resolve("react-native");

// RC0's component barrel omits RN 0.88's AssetRegistry (upstream #506).
// expo-asset is not UI: keep its imports on RN's real, shared asset registry.
// Remove once the pinned NativeWind/react-native-css pair includes the fix.
nativewindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  const fromExpoAsset = /[/\\]node_modules[/\\]expo-asset[/\\]/.test(context.originModulePath);
  if (platform !== "web" && fromExpoAsset &&
      (moduleName === "react-native" || moduleName === "react-native-css/components")) {
    return { type: "sourceFile", filePath: reactNativeEntry };
  }
  return resolveWithNativewind(context, moduleName, platform);
};

module.exports = nativewindConfig;
