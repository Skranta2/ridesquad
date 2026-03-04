import React, { useState } from 'react';
import { Alert, ActivityIndicator, View, StyleSheet } from 'react-native';
import AuthScreen from '../components/AuthScreen';
import OnboardingScreen from '../components/OnboardingScreen';
import { getCurrentUser } from '../lib/supabase';
import { getProfile } from '../lib/database';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

export default function AuthPage() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [initialName, setInitialName] = useState<string | undefined>();
  const [checkingProfile, setCheckingProfile] = useState(false);
  const router = useRouter();
  const { colors } = useTheme();

  const handleAuthSuccess = async (metadata?: { fullName?: string }) => {
    try {
      setCheckingProfile(true);
      const user = await getCurrentUser();
      if (user) {
        // Check if user already has a completed profile
        const existingProfile = await getProfile(user.id);

        if (existingProfile?.onboarding_completed) {
          // Returning user — skip onboarding, go straight to tabs
          router.replace('/(tabs)');
          return;
        }

        // New user or incomplete onboarding — show onboarding
        if (metadata?.fullName) {
          setInitialName(metadata.fullName);
        }
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error checking profile:', error);
      // If profile check fails, show onboarding as fallback
      if (metadata?.fullName) {
        setInitialName(metadata.fullName);
      }
      setShowOnboarding(true);
    } finally {
      setCheckingProfile(false);
    }
  };

  const handleOnboardingComplete = () => {
    router.replace('/(tabs)');
  };

  if (checkingProfile) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingScreen
        onComplete={handleOnboardingComplete}
        initialName={initialName}
      />
    );
  }

  return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
