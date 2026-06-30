// ⚠️ DEMO BUILD FLAG — must be `false` for any production / store release.
//
// When DEMO_BUILD is true:
//   • The export paywall is BYPASSED — PDF/CSV export runs without a
//     purchase, so a reviewer (e.g. Pablo's tax preparer) can see the
//     full export the contador would actually receive.
//   • The app is built WITHOUT react-native-iap (removed from
//     package.json) because that library doesn't compile against
//     React Native 0.81. The IAP code falls back to its stub provider.
//
// TODO BEFORE LAUNCH (un-demo the build):
//   1. Set DEMO_BUILD = false.
//   2. Re-add the store library: `npx expo install react-native-iap`
//      (or migrate to its current Nitro API if upgrading).
//   3. Verify the real paywall gates export again, and re-run the
//      sandbox StoreKit / Play Billing purchase test.
export var DEMO_BUILD = true;
