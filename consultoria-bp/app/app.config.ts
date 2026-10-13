export default {
  expo: {
    name: 'Consultoria B+P',
    slug: 'consultoria-bp',
    version: '1.0.0',
    orientation: 'portrait',
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
      googleServicesFile: './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#FFFFFF',
      },
    },
    plugins: [
      'expo-asset',
      '@react-native-google-signin/google-signin',
      ['expo-document-picker', { iCloudContainerEnvironment: 'Production' }],
      'expo-camera',
      'expo-file-system',
      'expo-secure-store',
    ],
    extra: {
      eas: { projectId: 'a7317d8e-dd84-4eda-93c5-7ca2f8f79eb6' },
      backendUrl: process.env.BACKEND_URL ?? 'http://192.168.3.103:8000',
      googleWebClientId: '847964133995-d8rdngrmbj2u05ilkrqhi8asgob9ujt4.apps.googleusercontent.com',
    },
  },
}
