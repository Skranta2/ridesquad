import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

// Google Sign-In is optional — only imported if the package is installed
let GoogleSignin: any = null;
let isSuccessResponse: any = null;
try {
  const google = require('@react-native-google-signin/google-signin');
  GoogleSignin = google.GoogleSignin;
  isSuccessResponse = google.isSuccessResponse;
} catch {
  // Google Sign-In package not installed — Google login will be unavailable
}

export interface AppleCredential {
  identityToken: string;
  fullName?: {
    givenName: string | null;
    familyName: string | null;
  };
  email?: string | null;
}

export interface GoogleCredential {
  idToken: string;
  rawNonce: string;
  user: {
    name: string | null;
    email: string;
  };
}

// Configure Google Sign-In — call once at app startup (no-op if not installed)
export function configureGoogleSignIn() {
  if (!GoogleSignin) return;
  try {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
  } catch (error) {
    console.warn('Google Sign-In configuration failed:', error);
  }
}

// Check if Apple Sign-In is available (iOS 13+ only)
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}

// Perform Apple Sign-In
export async function performAppleSignIn(): Promise<AppleCredential> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple Sign-In failed: no identity token received');
  }

  return {
    identityToken: credential.identityToken,
    fullName: credential.fullName
      ? {
          givenName: credential.fullName.givenName,
          familyName: credential.fullName.familyName,
        }
      : undefined,
    email: credential.email,
  };
}

// Generate a secure nonce for Google Sign-In
async function generateNonce(): Promise<{ rawNonce: string; hashedNonce: string }> {
  const rawNonce = Crypto.getRandomValues(new Uint8Array(32))
    .reduce((acc: string, byte: number) => acc + byte.toString(16).padStart(2, '0'), '');

  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );

  return { rawNonce, hashedNonce };
}

// Perform Google Sign-In
export async function performGoogleSignIn(): Promise<GoogleCredential> {
  if (!GoogleSignin) {
    throw new Error('Google Sign-In is not configured');
  }

  await GoogleSignin.hasPlayServices();

  const { rawNonce, hashedNonce } = await generateNonce();

  const response = await GoogleSignin.signIn({ nonce: hashedNonce });

  if (!isSuccessResponse(response)) {
    throw new Error('Google Sign-In was cancelled');
  }

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error('Google Sign-In failed: no ID token received');
  }

  return {
    idToken,
    rawNonce,
    user: {
      name: response.data.user.name,
      email: response.data.user.email,
    },
  };
}
