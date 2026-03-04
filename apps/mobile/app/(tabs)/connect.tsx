import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useTranslation } from '@/localization/i18n';

export default function ConnectScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

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
  footerNote: {
    marginTop: 4,
    fontSize: 12,
    textAlign: 'center',
  },
});
