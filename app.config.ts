import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const hasSentryBuildCredentials = Boolean(
    process.env.SENTRY_AUTH_TOKEN &&
    process.env.SENTRY_ORG &&
    process.env.SENTRY_PROJECT
  );

  const plugins: ExpoConfig['plugins'] = [
    'expo-router',
    'expo-sqlite',
    'expo-secure-store',
    [
      'expo-notifications',
      {
        icon: './assets/images/icon.png',
        color: '#4f46e5',
      },
    ],
  ];

  if (hasSentryBuildCredentials) {
    plugins.push('@sentry/react-native/expo');
  }

  return {
    ...config,
    name: 'Life in the UK Test 2026',
    slug: 'life-in-uk-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'lifeinukapp',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#1a1a2e',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.lifeinuk.app',
      buildNumber: '1',
      infoPlist: {
        NSCameraUsageDescription: 'This app does not use the camera.',
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#1a1a2e',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      package: 'com.lifeinuk.app',
      versionCode: 1,
      permissions: ['INTERNET'],
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins,
    experiments: {
      typedRoutes: true,
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
      eas: {
        projectId: 'a90876be-7d9b-4325-a962-244b16f870b6',
      },
    },
  };
};
