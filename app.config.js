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
    // expo-notifications powers the on-device quarterly estimated-tax
    // reminders. Tajada schedules LOCAL notifications only (no push
    // server, no tokens) — the plugin sets up the Android notification
    // channel/icon and the iOS scheduling entitlement. No push
    // credentials are required because nothing is sent from a server.
    //
    // expo-image-picker powers receipt photos. The plugin injects the
    // iOS usage strings (NSPhotoLibraryUsageDescription /
    // NSCameraUsageDescription) — re-added here now that the feature
    // actually exercises them (the audit had removed the bare
    // declaration to avoid a 5.1.1 rejection). Receipts are copied into
    // the app's private document directory; nothing is uploaded.
    plugins: [
      'expo-notifications',
      [
        'expo-image-picker',
        {
          photosPermission: 'Tajada usa tus fotos para que adjuntes recibos a tus transacciones. Las imágenes se guardan solo en tu dispositivo.',
          cameraPermission: 'Tajada usa la cámara para que tomes fotos de tus recibos. Las imágenes se guardan solo en tu dispositivo.',
        },
      ],
      // Local plugin: selects the Play Store flavor of react-native-iap
      // so the Android release build doesn't fail on variant ambiguity.
      './plugins/withIapStoreFlavor',
    ],
    scheme: 'tajada',
    extra: {
      eas: {
        projectId: '39ac0969-1845-4c37-83f0-157adc6d4744',
      },
    },
  },
};
