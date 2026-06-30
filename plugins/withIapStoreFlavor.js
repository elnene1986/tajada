// Local Expo config plugin — pick the Play Store flavor of react-native-iap.
//
// react-native-iap ships TWO Android product flavors, 'play' and
// 'amazon'. Without telling Gradle which one the app wants, the release
// build fails with a variant-ambiguity error ("cannot choose between
// amazonReleaseRuntimeElements and playReleaseRuntimeElements"). This
// injects `missingDimensionStrategy 'store', 'play'` into the generated
// android/app/build.gradle defaultConfig so the build resolves to Google
// Play Billing. Runs during prebuild; the android/ folder isn't checked
// in (managed workflow), so this is the right place for the edit.

const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withIapStoreFlavor(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    const contents = cfg.modResults.contents;
    if (contents.includes("missingDimensionStrategy 'store'")) return cfg;
    cfg.modResults.contents = contents.replace(
      /defaultConfig\s*\{/,
      (match) => `${match}\n        missingDimensionStrategy 'store', 'play'`
    );
    return cfg;
  });
};
