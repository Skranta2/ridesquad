import React, { useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, useRouter } from 'expo-router';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useTranslation } from '@/localization/i18n';
import { LanguageCode, ThemeMode, useAppSettings } from '@/state/AppSettingsContext';
import { useUserProfile } from '@/context/UserProfileContext';
import { useBluetooth } from '@/context/BluetoothContext';
import { signOut } from '@/lib/supabase';

type RowProps = {
  title: string;
  value?: string;
  onPress?: () => void;
  rightIcon?: ComponentProps<typeof FontAwesome>['name'];
};

function SettingsRow({
  title,
  value,
  onPress,
  rightIcon = 'chevron-right',
  backgroundColor,
  pressedBackgroundColor,
  secondaryTextColor,
}: RowProps & {
  backgroundColor: string;
  pressedBackgroundColor: string;
  secondaryTextColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? pressedBackgroundColor : backgroundColor }]}>
      <Text style={styles.rowTitle}>{title}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={[styles.rowValue, { color: secondaryTextColor }]}>{value}</Text> : null}
        <FontAwesome name={rightIcon} size={14} color={secondaryTextColor} />
      </View>
    </Pressable>
  );
}

type OptionRowProps<T extends string> = {
  title: string;
  value: T;
  selected: boolean;
  onSelect: (value: T) => void;
};

function OptionRow<T extends string>({
  title,
  value,
  selected,
  onSelect,
  backgroundColor,
  pressedBackgroundColor,
}: OptionRowProps<T> & {
  backgroundColor: string;
  pressedBackgroundColor: string;
}) {
  return (
    <Pressable
      onPress={() => onSelect(value)}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? pressedBackgroundColor : backgroundColor }]}>
      <Text style={styles.rowTitle}>{title}</Text>
      <View style={styles.rowRight}>
        {selected ? <FontAwesome name="check" size={16} color="#007AFF" /> : null}
      </View>
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  return <Text style={[styles.sectionHeader, { color: Colors[colorScheme].secondaryText }]}>{title}</Text>;
}

function SectionCard({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.sectionCard, style]}>{children}</View>;
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { themeMode, setThemeMode, language, setLanguage } = useAppSettings();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { profile, updateUserProfile } = useUserProfile();
  const { preferredDeviceName, isConnected } = useBluetooth();
  const router = useRouter();

  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [savingName, setSavingName] = useState(false);

  const languageLabelByCode: Record<LanguageCode, string> = {
    en: 'English',
    sv: 'Svenska',
    fi: 'Suomi',
    no: 'Norsk',
    de: 'Deutsch',
    es: 'Español',
  };

  const themeLabelByMode: Record<ThemeMode, string> = {
    system: t('settings.system'),
    light: t('settings.light'),
    dark: t('settings.dark'),
  };

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setSavingName(true);
    try {
      await updateUserProfile({ display_name: displayName.trim() });
      setEditingName(false);
      Alert.alert(t('settings.profileSaved'));
    } catch (error: any) {
      Alert.alert(t('common.error'), t('settings.profileSaveFailed'));
    } finally {
      setSavingName(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      t('settings.signOut'),
      t('settings.signOutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.signOut'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/auth');
            } catch (error: any) {
              console.error('Error signing out:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: palette.groupedBackground }}
      contentContainerStyle={[styles.container, { backgroundColor: palette.groupedBackground }]}
      contentInsetAdjustmentBehavior="automatic">
      <Text style={styles.title}>{t('settings.title')}</Text>

      {/* Profile Section */}
      <SectionHeader title={t('settings.profile')} />
      <SectionCard style={{ backgroundColor: palette.cardBackground, borderColor: palette.separator }}>
        <View style={styles.profileRow}>
          <View style={[styles.profileAvatar, { backgroundColor: palette.tint }]}>
            <Text style={styles.profileAvatarText}>
              {(profile?.display_name ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            {editingName ? (
              <View style={styles.editNameRow}>
                <TextInput
                  style={[
                    styles.nameInput,
                    {
                      color: colorScheme === 'dark' ? '#fff' : '#000',
                      borderColor: palette.separator,
                      backgroundColor: palette.groupedBackground,
                    },
                  ]}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoFocus
                  editable={!savingName}
                />
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: palette.tint }]}
                  onPress={handleSaveName}
                  disabled={savingName || !displayName.trim()}
                >
                  {savingName ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <FontAwesome name="check" size={14} color="#fff" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cancelEditButton, { borderColor: palette.separator }]}
                  onPress={() => {
                    setEditingName(false);
                    setDisplayName(profile?.display_name ?? '');
                  }}
                  disabled={savingName}
                >
                  <FontAwesome name="times" size={14} color={palette.secondaryText} />
                </TouchableOpacity>
              </View>
            ) : (
              <Pressable onPress={() => setEditingName(true)} style={styles.nameDisplay}>
                <Text style={[styles.profileName, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
                  {profile?.display_name ?? t('settings.displayName')}
                </Text>
                <FontAwesome name="pencil" size={14} color={palette.secondaryText} />
              </Pressable>
            )}
            <Text style={[styles.profileEmail, { color: palette.secondaryText }]}>
              {profile?.email ?? ''}
            </Text>
          </View>
        </View>
      </SectionCard>

      {/* Audio Device Section */}
      <SectionHeader title={t('bluetooth.audioDevice')} />
      <SectionCard style={{ backgroundColor: palette.cardBackground, borderColor: palette.separator }}>
        <Pressable
          onPress={() => router.push('/bluetooth')}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: pressed ? palette.cardPressed : palette.cardBackground },
          ]}
        >
          <View style={styles.audioDeviceRow}>
            <FontAwesome name="bluetooth-b" size={18} color={palette.tint} />
            <View style={styles.audioDeviceInfo}>
              <Text style={styles.rowTitle}>
                {preferredDeviceName ?? t('bluetooth.notSetUp')}
              </Text>
              {preferredDeviceName && (
                <View style={styles.audioDeviceStatus}>
                  <View
                    style={[
                      styles.audioStatusDot,
                      { backgroundColor: isConnected ? '#34C759' : '#FF9500' },
                    ]}
                  />
                  <Text style={[styles.audioStatusText, { color: palette.secondaryText }]}>
                    {isConnected ? t('bluetooth.connected') : t('bluetooth.notConnected')}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.rowRight}>
            <FontAwesome name="chevron-right" size={14} color={palette.secondaryText} />
          </View>
        </Pressable>
      </SectionCard>

      <SectionHeader title={t('settings.appearance')} />
      <SectionCard style={{ backgroundColor: palette.cardBackground, borderColor: palette.separator }}>
        <OptionRow<ThemeMode>
          title={t('settings.system')}
          value="system"
          selected={themeMode === 'system'}
          onSelect={setThemeMode}
          backgroundColor={palette.cardBackground}
          pressedBackgroundColor={palette.cardPressed}
        />
        <View style={[styles.divider, { backgroundColor: palette.separator }]} />
        <OptionRow<ThemeMode>
          title={t('settings.light')}
          value="light"
          selected={themeMode === 'light'}
          onSelect={setThemeMode}
          backgroundColor={palette.cardBackground}
          pressedBackgroundColor={palette.cardPressed}
        />
        <View style={[styles.divider, { backgroundColor: palette.separator }]} />
        <OptionRow<ThemeMode>
          title={t('settings.dark')}
          value="dark"
          selected={themeMode === 'dark'}
          onSelect={setThemeMode}
          backgroundColor={palette.cardBackground}
          pressedBackgroundColor={palette.cardPressed}
        />
      </SectionCard>

      <SectionHeader title={t('settings.language')} />
      <SectionCard style={{ backgroundColor: palette.cardBackground, borderColor: palette.separator }}>
        {(Object.keys(languageLabelByCode) as LanguageCode[]).map((code, idx, arr) => (
          <View key={code}>
            <OptionRow<LanguageCode>
              title={languageLabelByCode[code]}
              value={code}
              selected={language === code}
              onSelect={setLanguage}
              backgroundColor={palette.cardBackground}
              pressedBackgroundColor={palette.cardPressed}
            />
            {idx < arr.length - 1 ? <View style={[styles.divider, { backgroundColor: palette.separator }]} /> : null}
          </View>
        ))}
      </SectionCard>

      <SectionHeader title={t('settings.help')} />
      <SectionCard style={{ backgroundColor: palette.cardBackground, borderColor: palette.separator }}>
        <Link href="/qa" asChild>
          <Pressable
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: pressed ? palette.cardPressed : palette.cardBackground },
            ]}>
            <Text style={styles.rowTitle}>{t('settings.qa')}</Text>
            <View style={styles.rowRight}>
              <FontAwesome name="chevron-right" size={14} color={palette.secondaryText} />
            </View>
          </Pressable>
        </Link>
        <View style={[styles.divider, { backgroundColor: palette.separator }]} />
        <SettingsRow
          title={t('settings.website')}
          value="tillmankonsult.se"
          onPress={() => Linking.openURL('https://www.tillmankonsult.se/')}
          rightIcon="external-link"
          backgroundColor={palette.cardBackground}
          pressedBackgroundColor={palette.cardPressed}
          secondaryTextColor={palette.secondaryText}
        />
      </SectionCard>

      {/* Sign Out */}
      <View style={styles.signOutSection}>
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: palette.cardBackground, borderColor: palette.separator }]}
          onPress={handleSignOut}
        >
          <FontAwesome name="sign-out" size={18} color="#FF3B30" />
          <Text style={styles.signOutText}>{t('settings.signOut')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.footerNote, { color: palette.secondaryText }]}>
        {t('settings.appearance')}: {themeLabelByMode[themeMode]}  ·  {t('settings.language')}: {languageLabelByCode[language]}
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
  sectionHeader: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sectionCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTitle: {
    fontSize: 17,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowValue: {
    fontSize: 15,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 14,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600',
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  nameDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  saveButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelEditButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioDeviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  audioDeviceInfo: {
    flex: 1,
  },
  audioDeviceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  audioStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  audioStatusText: {
    fontSize: 13,
  },
  signOutSection: {
    marginTop: 24,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  signOutText: {
    color: '#FF3B30',
    fontSize: 17,
    fontWeight: '600',
  },
  footerNote: {
    marginTop: 18,
    fontSize: 12,
    textAlign: 'center',
  },
});
