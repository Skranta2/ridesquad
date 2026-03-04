import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform, AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS !== 'web',
  },
});

// Auto-refresh tokens when app comes to foreground
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

// Auth state change listener
export const onAuthStateChange = (callback: any) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};

// --- Apple Sign-In ---
export const signInWithApple = async (identityToken: string) => {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: identityToken,
  });

  if (error) {
    console.error('Error signing in with Apple:', error.message);
    throw error;
  }

  return { data, error };
};

// --- Google Sign-In ---
export const signInWithGoogle = async (idToken: string, rawNonce?: string) => {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
    ...(rawNonce ? { nonce: rawNonce } : {}),
  });

  if (error) {
    console.error('Error signing in with Google:', error.message);
    throw error;
  }

  return { data, error };
};

// --- Email/Password Sign Up ---
export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error('Error signing up:', error.message);
    throw error;
  }

  return { data, error };
};

// --- Email/Password Sign In ---
export const signInWithPassword = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Error signing in:', error.message);
    throw error;
  }

  return { data, error };
};

// --- Password Reset ---
export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'ridesquad://reset-password',
  });

  if (error) {
    console.error('Error resetting password:', error.message);
    throw error;
  }

  return { data, error };
};

// --- Update Password (after reset link clicked) ---
export const updatePassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error('Error updating password:', error.message);
    throw error;
  }

  return { data, error };
};

// Sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error.message);
    throw error;
  }
};

// Get current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Get current session
export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};
