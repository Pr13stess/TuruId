const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

// Expo detects the npm workspace and configures monorepo resolution automatically.
/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = withNativewind(config);
