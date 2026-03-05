import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useTranslation } from '@/localization/i18n';

export default function ConnectScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const [inviteLink, setInviteLink] = useState('');

  const handleJoinWithLink = () => {
    const trimmed = inviteLink.trim();

    // Full deep-link or URL containing the invite path
    const urlMatch = trimmed.match(/invite\/(session|team|friend)\/([a-z0-9]+)/i);
    if (urlMatch) {
      const [, type, token] = urlMatch;
      setInviteLink('');
      router.push({ pathname: '/accept-invite', params: { type, token } } as any);
      return;
    }

    // Bare token pasted directly (e.g. copied from the Friends tab)
    const bareMatch = trimmed.match(/^[a-z0-9]{6,}$/i);
    if (bareMatch) {
      setInviteLink('');
      router.push({ pathname: '/accept-invite', params: { type: 'friend', token: trimmed } } as any);
      return;
    }

    Alert.alert(t('common.error'), t('connect.invalidLink'));
  };

  return (
    <ScrollView
      style={{ backgroundColor: palette.groupedBackground }}
      contentContainerStyle={[styles.container, { backgroundColor: palette.groupedBackground }]}
      contentInsetAdjustmentBehavior="automatic">
      <Text style={styles.title}>{t('connect.title')}</Text>

      <View style={[styles.card, { backgroundColor: palette.cardBackground, borderColor: palette.separator }]}>
        <Text style={styles.cardTitle}>{t('connect.startSession')}</Text>
        <Text style={[styles.cardSubtitle, { color: palette.secondaryText }]}>
          {t('connect.startSessionDescription')}
        </Text>

        <Pressable
          disabled
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: pressed ? palette.cardPressed : palette.tint, opacity: 0.6 },
          ]}>
          <FontAwesome name="play" size={16} color="#fff" />
          <Text style={styles.primaryButtonText}>{t('connect.startSessionButton')}</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: palette.cardBackground, borderColor: palette.separator }]}>
        <Text style={styles.cardTitle}>{t('connect.joinSession')}</Text>
        <Text style={[styles.cardSubtitle, { color: palette.secondaryText }]}>
          {t('connect.joinSessionDescription')}
        </Text>

        <Pressable
          disabled
          style={({ pressed }) => [
            styles.secondaryButton,
            { backgroundColor: pressed ? palette.cardPressed : palette.groupedBackground, opacity: 0.6 },
          ]}>
          <FontAwesome name="qrcode" size={16} color={palette.tint} />
          <Text style={[styles.secondaryButtonText, { color: palette.tint }]}>
            {t('connect.scanQr')} ({t('connect.comingSoon')})
          </Text>
        </Pressable>
      </View>

      {/* Enter Invite Link */}
      <View style={[styles.card, { backgroundColor: palette.cardBackground, borderColor: palette.separator }]}>
        <Text style={styles.cardTitle}>{t('connect.enterInviteLink')}</Text>
        <Text style={[styles.cardSubtitle, { color: palette.secondaryText }]}>
          {t('connect.enterInviteLinkDescription')}
        </Text>
        <TextInput
          style={[
            styles.linkInput,
            {
              color: colorScheme === 'dark' ? '#fff' : '#000',
              borderColor: palette.separator,
              backgroundColor: palette.groupedBackground,
            },
          ]}
          value={inviteLink}
          onChangeText={setInviteLink}
          placeholder={t('connect.inviteLinkPlaceholder')}
          placeholderTextColor={palette.secondaryText}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={handleJoinWithLink}
        />
        <Pressable
          onPress={handleJoinWithLink}
          disabled={!inviteLink.trim()}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: pressed ? palette.cardPressed : palette.tint,
              opacity: inviteLink.trim() ? 1 : 0.4,
            },
          ]}>
          <FontAwesome name="sign-in" size={16} color="#fff" />
          <Text style={styles.primaryButtonText}>{t('connect.joinWithLink')}</Text>
        </Pressable>
      </View>

      <Text style={[styles.footerNote, { color: palette.secondaryText }]}>
        {t('connect.footerNote')}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  linkInput: {
    marginTop: 10,
    height: 42,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  footerNote: {
    marginTop: 4,
    fontSize: 12,
    textAlign: 'center',
  },
});
