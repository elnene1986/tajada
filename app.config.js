// Expo app config — Tajada.

module.exports = {
  expo: {
    name: 'Tajada',
    slug: 'tajada',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#F2E9D8',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.tajada.app',
      buildNumber: '1',
      infoPlist: {
        // Justified usage strings — only declared for permissions the
        // app actually exercises. Apple Guideline 5.1.1 rejects builds
        // that declare permissions without using them. Receipt photos
        // are a future feature (see CLAUDE.md Phase 7); re-add
        // NSPhotoLibraryUsageDescription when expo-image-picker is wired.
        NSDocumentsFolderUsageDescription: 'Tajada necesita acceso para leer tus archivos de estados de cuenta.',

        // App-wide encryption declaration. Tajada uses AES-256-GCM for
        // the optional encrypted backup feature — that data stays on
        // the user's device or wherever the user chooses to put the
        // backup file (iCloud Drive, AirDrop, etc.). It is not
        // transmitted over the network from this app. This qualifies
        // for the "limited cryptography" exemption under BIS 740.17(b)
        // (only encrypting user data at rest, using standard
        // algorithms). Declaring `false` here lets every TestFlight /
        // App Store build pass the encryption compliance check
        // automatically instead of having to answer the questionnaire
        // by hand for each submission.
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#F2E9D8',
      },
      edgeToEdgeEnabled: true,
      package: 'com.tajada.app',
      versionCode: 1,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    scheme: 'tajada',
  },
};
