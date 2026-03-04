import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTranslation } from '../localization/i18n';
import { useTheme } from '../context/ThemeContext';
import { useUserProfile } from '../context/UserProfileContext';
import {
  getInviteByToken,
  acceptInvite,
  addTeamMember,
  addMutualFavorites,
} from '../lib/database';
import type { Invite } from '../lib/types';

export default function AcceptInviteScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { profile } = useUserProfile();
  const router = useRouter();
  const params = useLocalSearchParams<{ type: string; token: string }>();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvite();
  }, []);

  const loadInvite = async () => {
    try {
      if (!params.token) {
        setError(t('invite.invalidLink'));
        setLoading(false);
        return;
      }

      const found = await getInviteByToken(params.token);
      if (!found) {
        setError(t('invite.notFound'));
        setLoading(false);
        return;
      }

      if (found.used_at) {
        setError(t('invite.alreadyUsed'));
        setLoading(false);
        return;
      }

      if (new Date(found.expires_at) < new Date()) {
        setError(t('invite.expired'));
        setLoading(false);
        return;
      }

      setInvite(found);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!invite || !profile) return;

    setAccepting(true);
    try {
      // Mark invite as used
      await acceptInvite(invite.id, profile.id);

      if (invite.type === 'team') {
        // Add user as team member with 24h active status
        await addTeamMember(invite.target_id, profile.id);
        Alert.alert(t('invite.success'), t('invite.teamJoined'), [
          { text: 'OK', onPress: () => router.replace('/(tabs)/teams') },
        ]);
      } else if (invite.type === 'friend') {
        // Add mutual favorites (both users become favorites of each other)
        await addMutualFavorites(invite.created_by, profile.id);
        Alert.alert(t('invite.success'), t('invite.friendAdded'), [
          { text: 'OK', onPress: () => router.replace('/(tabs)/friends') },
        ]);
      } else {
        // Session invite — navigate to connect tab
        Alert.alert(t('invite.success'), t('invite.sessionJoined'), [
          { text: 'OK', onPress: () => router.replace('/(tabs)/connect') },
        ]);
      }
    } catch (error: any) {
      if (error.message?.includes('Maximum team member limit')) {
        Alert.alert(t('invite.error'), t('invite.teamFull'));
      } else {
        Alert.alert(t('invite.error'), t('invite.acceptFailed'));
      }
    } finally {
      setAccepting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : error ? (
        <View style={styles.content}>
          <FontAwesome name="exclamation-circle" size={48} color="#FF3B30" />
          <Text style={[styles.errorTitle, { color: colors.text }]}>{t('invite.error')}</Text>
          <Text style={[styles.errorMessage, { color: colors.secondaryText }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>{t('invite.goBack')}</Text>
          </TouchableOpacity>
        </View>
      ) : invite ? (
        <View style={styles.content}>
          <FontAwesome
            name={invite.type === 'team' ? 'users' : invite.type === 'friend' ? 'user-plus' : 'comments'}
            size={48}
            color={colors.primary}
          />
          <Text style={[styles.inviteTitle, { color: colors.text }]}>
            {invite.type === 'team'
              ? t('invite.teamInviteTitle')
              : invite.type === 'friend'
              ? t('invite.friendInviteTitle')
              : t('invite.sessionInviteTitle')}
          </Text>
          <Text style={[styles.inviteDescription, { color: colors.secondaryText }]}>
            {invite.type === 'team'
              ? t('invite.teamInviteDescription')
              : invite.type === 'friend'
              ? t('invite.friendInviteDescription')
              : t('invite.sessionInviteDescription')}
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleAccept}
            disabled={accepting}
          >
            {accepting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('invite.acceptButton')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={() => router.back()}
            disabled={accepting}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              {t('invite.declineButton')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  inviteTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  inviteDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
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
