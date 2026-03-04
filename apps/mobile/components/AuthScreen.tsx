import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useTranslation } from '../localization/i18n';
import { useTheme } from '../context/ThemeContext';
import {
  signInWithApple,
  signInWithGoogle,
  signInWithPassword,
  signUpWithEmail,
  resetPassword,
} from '../lib/supabase';
import {
  performAppleSignIn,
  performGoogleSignIn,
  isAppleSignInAvailable,
} from '../lib/authProviders';

type AuthMode = 'signIn' | 'signUp' | 'forgotPassword';

interface AuthScreenProps {
  onAuthSuccess: (metadata?: { fullName?: string }) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
    // Google Sign-In is only available if client IDs are configured
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    setGoogleAvailable(!!webClientId && webClientId !== 'YOUR_GOOGLE_WEB_CLIENT_ID');
  }, []);

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const credential = await performAppleSignIn();
      await signInWithApple(credential.identityToken);

      // Apple only returns name on first sign-in
      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName]
            .filter(Boolean)
            .join(' ')
        : undefined;

      onAuthSuccess(fullName ? { fullName } : undefined);
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(t('auth.error'), t('auth.appleSignInFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const credential = await performGoogleSignIn();
      await signInWithGoogle(credential.idToken, credential.rawNonce);
      onAuthSuccess(
        credential.user.name ? { fullName: credential.user.name } : undefined
      );
    } catch (error: any) {
      if (error.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert(t('auth.error'), t('auth.googleSignInFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
    if (!validateEmail(email)) {
      Alert.alert(t('auth.error'), t('auth.invalidEmail'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('auth.error'), t('auth.passwordTooShort'));
      return;
    }

    setLoading(true);
    try {
      await signInWithPassword(email, password);
      onAuthSuccess();
    } catch (error: any) {
      Alert.alert(t('auth.error'), t('auth.signInFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (!validateEmail(email)) {
      Alert.alert(t('auth.error'), t('auth.invalidEmail'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('auth.error'), t('auth.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('auth.error'), t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      const result = await signUpWithEmail(email, password);
      if (result.data?.session) {
        onAuthSuccess();
      } else {
        Alert.alert(t('auth.checkYourEmail'), t('auth.checkEmailForVerification'));
        setMode('signIn');
      }
    } catch (error: any) {
      Alert.alert(t('auth.error'), t('auth.signUpFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!validateEmail(email)) {
      Alert.alert(t('auth.error'), t('auth.invalidEmail'));
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setResetEmailSent(true);
    } catch (error: any) {
      Alert.alert(t('auth.error'), t('auth.resetPasswordFailed'));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setPassword('');
    setConfirmPassword('');
    setResetEmailSent(false);
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
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('auth.welcomeToRideSquad')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
              {t('auth.signInDescription')}
            </Text>
          </View>

          {/* Social Sign-In Buttons (only on signIn/signUp, not forgotPassword) */}
          {mode !== 'forgotPassword' && (
            <View style={styles.socialButtons}>
              {appleAvailable && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={
                    isDark
                      ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                      : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                  }
                  cornerRadius={12}
                  style={styles.appleButton}
                  onPress={handleAppleSignIn}
                />
              )}

              {googleAvailable && (
                <TouchableOpacity
                  style={[styles.googleButton, { borderColor: colors.border }]}
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.text} />
                  ) : (
                    <Text style={[styles.googleButtonText, { color: colors.text }]}>
                      {t('auth.signInWithGoogle')}
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              {/* Divider */}
              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.secondaryText }]}>
                  {t('auth.orDivider')}
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>
            </View>
          )}

          {/* Email/Password Form */}
          <View style={styles.form}>
            {mode === 'forgotPassword' ? (
              // Forgot Password View
              <View>
                {resetEmailSent ? (
                  <View style={styles.successMessage}>
                    <Text style={[styles.successText, { color: colors.text }]}>
                      {t('auth.resetEmailSent')}
                    </Text>
                    <TouchableOpacity
                      style={[styles.button, { backgroundColor: colors.primary }]}
                      onPress={() => switchMode('signIn')}
                    >
                      <Text style={styles.buttonText}>{t('auth.backToSignIn')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Text style={[styles.formTitle, { color: colors.text }]}>
                      {t('auth.resetPassword')}
                    </Text>
                    <TextInput
                      style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                      placeholder={t('auth.emailPlaceholder')}
                      placeholderTextColor={colors.secondaryText}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      style={[styles.button, { backgroundColor: colors.primary }]}
                      onPress={handleForgotPassword}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>{t('auth.resetPasswordButton')}</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.linkButton}
                      onPress={() => switchMode('signIn')}
                    >
                      <Text style={[styles.linkButtonText, { color: colors.primary }]}>
                        {t('auth.backToSignIn')}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : (
              // Sign In / Sign Up View
              <>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                  placeholder={t('auth.emailPlaceholder')}
                  placeholderTextColor={colors.secondaryText}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                  placeholder={t('auth.passwordPlaceholder')}
                  placeholderTextColor={colors.secondaryText}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
                {mode === 'signUp' && (
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                    placeholder={t('auth.confirmPasswordPlaceholder')}
                    placeholderTextColor={colors.secondaryText}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    editable={!loading}
                  />
                )}

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }]}
                  onPress={mode === 'signIn' ? handleEmailSignIn : handleEmailSignUp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {mode === 'signIn' ? t('auth.signInButton') : t('auth.signUpButton')}
                    </Text>
                  )}
                </TouchableOpacity>

                {mode === 'signIn' && (
                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => switchMode('forgotPassword')}
                  >
                    <Text style={[styles.linkButtonText, { color: colors.primary }]}>
                      {t('auth.forgotPassword')}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => switchMode(mode === 'signIn' ? 'signUp' : 'signIn')}
                >
                  <Text style={[styles.linkButtonText, { color: colors.primary }]}>
                    {mode === 'signIn' ? t('auth.switchToSignUp') : t('auth.switchToSignIn')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
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
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
  socialButtons: {
    marginBottom: 8,
  },
  appleButton: {
    height: 56,
    marginBottom: 12,
  },
  googleButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  form: {
    width: '100%',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    paddingVertical: 10,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  successMessage: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
});
