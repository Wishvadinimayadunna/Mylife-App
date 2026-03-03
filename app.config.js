module.exports = {
  expo: {
    ...require("./app.json").expo,
    updates: {
      enabled: false,
      checkAutomatically: "never",
      fallbackToCacheTimeout: 0,
    },
    runtimeVersion: {
      policy: "nativeVersion",
    },
  },
};
