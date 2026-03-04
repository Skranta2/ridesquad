import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';
import { Linking } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { AppSettingsProvider } from '@/state/AppSettingsContext';
import { useAppSettings } from '@/state/AppSettingsContext';
import { ThemeProvider as CustomThemeProvider } from '@/context/ThemeContext';
import { UserProfileProvider } from '@/context/UserProfileContext';
import { BluetoothProvider } from '@/context/BluetoothContext';
import BluetoothBanner from '@/components/BluetoothBanner';
import { getCurrentUser, supabase } from '@/lib/supabase';
import { configureGoogleSignIn } from '@/lib/authProviders';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'auth',
};

// Keep splash screen visible while we check auth
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) {
    return null;
  }

  return (
    <AppSettingsProvider>
      <RootLayoutNav />
    </AppSettingsProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { loaded } = useAppSettings();
  const hasInitializedRef = useRef(false);
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  // Configure Google Sign-In once at startup
  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  // Check for existing session on mount — redirect to tabs if logged in
  useEffect(() => {
    if (!loaded || hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    async function checkUser() {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          // User has an active session — skip auth screen
          routerRef.current.replace('/(tabs)');
        }
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        // Hide splash screen after auth check (whether user found or not)
        SplashScreen.hideAsync();
      }
    }

    checkUser();
  }, [loaded]);

  // Listen for auth state changes (run once — use routerRef to avoid re-subscriptions)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip INITIAL_SESSION — handled by checkUser above
        if (event === 'INITIAL_SESSION') return;

        console.log('Auth state changed:', event, session?.user?.email);

        if (event === 'SIGNED_IN' && session?.user) {
          // Navigation handled by auth.tsx handleAuthSuccess
        } else if (event === 'SIGNED_OUT') {
          // Navigation handled by settings sign-out
        } else if (event === 'PASSWORD_RECOVERY') {
          routerRef.current.push('/reset-password');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle deep links for password reset and invites (run once)
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      // Ignore Expo dev server URLs — only handle ridesquad:// scheme
      if (!url.startsWith('ridesquad://')) return;

      console.log('Deep link received:', url);

      if (url.includes('reset-password')) {
        routerRef.current.push('/reset-password');
      } else if (url.includes('invite/')) {
        const match = url.match(/invite\/(session|team|friend)\/([a-z0-9]+)/);
        if (match) {
          const [, type, token] = match;
          routerRef.current.push({
            pathname: '/accept-invite',
            params: { type, token },
          } as any);
        }
      }
    };

    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Always render the Stack — splash screen covers the brief auth check
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <CustomThemeProvider>
        <UserProfileProvider>
          <BluetoothProvider>
            <BluetoothBanner />
            <Stack screenOptions={{ headerShown: false }} />
          </BluetoothProvider>
        </UserProfileProvider>
      </CustomThemeProvider>
    </ThemeProvider>
  );
}
