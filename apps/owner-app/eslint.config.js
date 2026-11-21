const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expo,
  // Expo cache and exported bundles are generated output, not application source.
  { ignores: [".expo/**", "dist/**", "supabase/functions/**"] },
]);
