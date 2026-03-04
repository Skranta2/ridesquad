import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useTranslation } from '@/localization/i18n';

export default function QAScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  return (
    <ScrollView
      style={{ backgroundColor: palette.groupedBackground }}
      contentContainerStyle={[styles.container, { backgroundColor: palette.groupedBackground }]}
      contentInsetAdjustmentBehavior="automatic">
      <Text style={styles.title}>{t('settings.qa')}</Text>

      <View style={[styles.card, { backgroundColor: palette.cardBackground, borderColor: palette.separator }]}>
        <Text style={styles.paragraph}>
          This page will contain common questions and answers about subscriptions, invites, audio, and privacy.
        </Text>

        <Pressable
          onPress={() => Linking.openURL('https://www.tillmankonsult.se/')}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: pressed ? palette.cardPressed : palette.groupedBackground },
          ]}>
          <FontAwesome name="external-link" size={16} color="#007AFF" />
          <Text style={styles.buttonText}>www.tillmankonsult.se</Text>
        </Pressable>
      </View>
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
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 22,
  },
  button: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
