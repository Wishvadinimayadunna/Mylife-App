const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Disable expo-updates in development
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "expo-updates") {
    return {
      type: "empty",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
