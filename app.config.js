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
        NSPhotoLibraryUsageDescription: 'Tajada necesita acceso para seleccionar fotos de recibos.',
        NSDocumentsFolderUsageDescription: 'Tajada necesita acceso para leer tus archivos de estados de cuenta.',
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
