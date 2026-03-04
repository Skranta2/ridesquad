import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useTranslation } from '../localization/i18n';
import { getCurrentUser, signOut, supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

interface OnboardingScreenProps {
  onComplete: () => void;
  initialName?: string;
}

export default function OnboardingScreen({ onComplete, initialName }: OnboardingScreenProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [fullName, setFullName] = useState(initialName || '');

  const handleComplete = async () => {
    if (!fullName.trim()) {
      Alert.alert(t('onboarding.nameRequired'), t('onboarding.pleaseEnterName'));
      return;
    }

    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert(t('onboarding.error'), t('onboarding.sessionExpired'));
        return;
      }

      // Upsert profile to Supabase with onboarding_completed flag
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email ?? null,
          display_name: fullName.trim(),
          marketing_consent: marketingConsent,
          marketing_consent_at: marketingConsent ? new Date().toISOString() : null,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        });

      if (error) {
        console.error('Error saving profile:', error);
        Alert.alert(t('onboarding.error'), t('onboarding.profileSaveError'));
        return;
      }

      onComplete();
    } catch (error: any) {
      console.error('Error in handleComplete:', error);
      Alert.alert(t('onboarding.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      t('onboarding.signOutTitle'),
      t('onboarding.signOutMessage'),
      [
        { text: t('onboarding.cancel'), style: 'cancel' },
        {
          text: t('onboarding.signOut'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error: any) {
              console.error('Error signing out:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('onboarding.welcome')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
              {t('onboarding.setupProfile')}
            </Text>
          </View>

          <View style={styles.content}>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('onboarding.profileInfo')}
              </Text>
              <Text style={[styles.label, { color: colors.text }]}>
                {t('onboarding.fullName')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={fullName}
                onChangeText={setFullName}
                placeholder={t('onboarding.enterName')}
                placeholderTextColor={colors.secondaryText}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('onboarding.preferences')}
              </Text>
              <View style={styles.consentContainer}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setMarketingConsent(!marketingConsent)}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: marketingConsent ? colors.primary : 'transparent',
                        borderColor: marketingConsent ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {marketingConsent && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={styles.consentText}>
                    <Text style={[styles.consentTitle, { color: colors.text }]}>
                      {t('onboarding.marketingConsent')}
                    </Text>
                    <Text style={[styles.consentDescription, { color: colors.secondaryText }]}>
                      {t('onboarding.marketingConsentDescription')}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleComplete}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>{t('onboarding.completeSetup')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                onPress={handleSignOut}
                disabled={loading}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                  {t('onboarding.signOut')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
    paddingTop: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  consentContainer: {
    marginTop: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  consentText: {
    flex: 1,
  },
  consentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  consentDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: 24,
    paddingBottom: 24,
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
