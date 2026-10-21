export default {
  expo: {
    name: 'Consultoria B+P',
    slug: 'consultoria-bp',
    // Mude a cada nova versão entregue (ver docs/VERSOES.md). Aparece no login e na tela inicial.
    version: '1.4.2',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    icon: './assets/images/icon.png',
    splash: {
      image: './assets/images/login_bg.png',
      resizeMode: 'cover',
      backgroundColor: '#0072BC',
    },
    ios: {
      bundleIdentifier: 'com.consultoriabp.app',
      supportsTablet: false,
    },
    android: {
      package: 'com.consultoriabp.app',
      permissions: ['android.permission.CAMERA'],
      blockedPermissions: ['android.permission.RECORD_AUDIO'],
      googleServicesFile: './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#FFFFFF',
      },
    },
    web: { favicon: './assets/images/favicon.png' },
    plugins: [
      '@react-native-google-signin/google-signin',
      [
        'expo-image-picker',
        {
          cameraPermission: 'Usado para fotografar as cargas, as intervenções e as leituras dos medidores.',
          photosPermission: 'Usado para escolher fotos das cargas e das intervenções.',
          microphonePermission: false, // o app não grava vídeo
        },
      ],
      'expo-secure-store',
      [
        'expo-build-properties',
        {
          android: {
            // celulares Android atuais são arm64: o APK deixa de levar bibliotecas de outras arquiteturas
            buildArchs: ['arm64-v8a'],
            enableMinifyInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
          },
        },
      ],
    ],
    extra: {
      eas: { projectId: 'a7317d8e-dd84-4eda-93c5-7ca2f8f79eb6' },
      googleWebClientId: '847964133995-d8rdngrmbj2u05ilkrqhi8asgob9ujt4.apps.googleusercontent.com',
    },
  },
}
