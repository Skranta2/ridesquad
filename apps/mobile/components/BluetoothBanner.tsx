// ============================================================================
// RideSquad Bluetooth Connection Banner
// Animated slide-down banner showing connected device on app launch
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useTranslation } from '@/localization/i18n';
import { useBluetooth } from '@/context/BluetoothContext';

export default function BluetoothBanner() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  const {
    preferredDeviceName,
    preferredDeviceId,
    isConnected,
  } = useBluetooth();

  const [visible, setVisible] = useState(false);
  const hasShownRef = useRef(false);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show banner once when preferred device is connected at app start
  useEffect(() => {
    if (hasShownRef.current) return;
    if (!preferredDeviceId || !isConnected) return;

    hasShownRef.current = true;
    setVisible(true);

    // Slide in
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();

    // Auto-dismiss after 5 seconds
    dismissTimerRef.current = setTimeout(() => {
      handleDismiss();
    }, 5000);
  }, [preferredDeviceId, isConnected]);

  const handleDismiss = () => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    Animated.timing(slideAnim, {
      toValue: -120,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
    });
  };

  const handleChange = () => {
    handleDismiss();
    router.push('/bluetooth');
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
          borderColor: palette.separator,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: '#34C759' + '20' }]}>
          <FontAwesome name="bluetooth-b" size={18} color="#34C759" />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.titleText, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
            {t('bluetooth.bannerConnected')}
          </Text>
          <Text style={[styles.deviceText, { color: palette.secondaryText }]} numberOfLines={1}>
            {preferredDeviceName ?? t('bluetooth.unknownDevice')}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.okButton, { backgroundColor: '#34C759' }]}
          onPress={handleDismiss}
        >
          <Text style={styles.okButtonText}>OK</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.changeButton, { borderColor: palette.separator }]}
          onPress={handleChange}
        >
          <Text style={[styles.changeButtonText, { color: palette.tint }]}>
            {t('bluetooth.bannerChange')}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50, // Below status bar
    left: 16,
    right: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
    padding: 14,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '600',
  },
  deviceText: {
    fontSize: 13,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  okButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  okButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  changeButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
