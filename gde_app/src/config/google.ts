import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';

const defaultScheme = process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_SCHEME || 'gdeapp';

const baseConfig = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
};

function resolveClientId() {
  if (Platform.OS === 'ios') {
    return baseConfig.iosClientId || baseConfig.webClientId;
  }
  if (Platform.OS === 'android') {
    return baseConfig.androidClientId || baseConfig.webClientId;
  }
  return baseConfig.webClientId;
}

export const googleOAuthConfig = {
  ...baseConfig,
  redirectScheme: defaultScheme,
  scopes: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/calendar'],
  clientId: resolveClientId(),
};

export function getRedirectUri(useProxy: boolean) {
  return AuthSession.makeRedirectUri({ useProxy, scheme: defaultScheme, path: 'oauth' });
}
