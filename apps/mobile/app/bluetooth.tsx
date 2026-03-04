// ============================================================================
// RideSquad Bluetooth Management Screen
// Scan for devices, select preferred device, open OS settings
// ============================================================================

import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useTranslation } from '@/localization/i18n';
import { useBluetooth, DiscoveredDevice } from '@/context/BluetoothContext';
import { rssiToSignalBars } from '@/lib/bluetoothManager';

// ============================================================================
// SIGNAL BARS COMPONENT
// ============================================================================

function SignalBars({ rssi, color }: { rssi: number | null; color: string }) {
  const bars = rssiToSignalBars(rssi);
  return (
    <View style={styles.signalBars}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.signalBar,
            {
              height: 8 + i * 4,
              backgroundColor: i < bars ? color : color + '30',
            },
          ]}
        />
      ))}
    </View>
  );
}

// ============================================================================
// MAIN SCREEN
// ============================================================================

export default function BluetoothScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  const {
    devices,
    preferredDeviceId,
    preferredDeviceName,
    scanning,
    bluetoothEnabled,
    isConnected,
    startScan,
    stopScan,
    selectDevice,
    forgetDevice,
    reconnect,
    openSettings,
  } = useBluetooth();

  const handleSelectDevice = async (device: DiscoveredDevice) => {
    stopScan();
    await selectDevice(device);
    Alert.alert(
      t('bluetooth.deviceSelected'),
      t('bluetooth.deviceSelectedMessage').replace('{name}', device.name ?? t('bluetooth.unknownDevice')),
      [{ text: 'OK' }]
    );
  };

  const handleForget = () => {
    Alert.alert(
      t('bluetooth.forgetDevice'),
      t('bluetooth.forgetDeviceConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('bluetooth.forget'),
          style: 'destructive',
          onPress: () => forgetDevice(),
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: palette.groupedBackground }}
      contentContainerStyle={[styles.container, { backgroundColor: palette.groupedBackground }]}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="chevron-left" size={18} color={palette.tint} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('bluetooth.title')}</Text>
      </View>

      {/* Bluetooth Status */}
      {!bluetoothEnabled && (
        <View style={[styles.statusBanner, { backgroundColor: '#FF3B30' + '15' }]}>
          <FontAwesome name="exclamation-triangle" size={16} color="#FF3B30" />
          <Text style={[styles.statusText, { color: '#FF3B30' }]}>
            {t('bluetooth.bluetoothOff')}
          </Text>
        </View>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* CURRENT DEVICE SECTION */}
      {/* ------------------------------------------------------------------ */}
      <Text style={[styles.sectionHeader, { color: palette.secondaryText }]}>
        {t('bluetooth.currentDevice')}
      </Text>
      <View style={[styles.card, { backgroundColor: palette.cardBackground, borderColor: palette.separator }]}>
        {preferredDeviceId ? (
          <>
            <View style={styles.currentDeviceRow}>
              <View style={[styles.deviceIcon, { backgroundColor: palette.tint + '15' }]}>
                <FontAwesome name="bluetooth-b" size={20} color={palette.tint} />
              </View>
              <View style={styles.deviceInfo}>
                <Text style={[styles.deviceName, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
                  {preferredDeviceName ?? t('bluetooth.unknownDevice')}
                </Text>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: isConnected ? '#34C759' : '#FF9500' },
                    ]}
                  />
                  <Text style={[styles.statusLabel, { color: palette.secondaryText }]}>
                    {isConnected ? t('bluetooth.connected') : t('bluetooth.notConnected')}
                  </Text>
                </View>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: palette.separator }]} />
            <View style={styles.currentDeviceActions}>
              {!isConnected && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: palette.tint }]}
                  onPress={reconnect}
                >
                  <FontAwesome name="refresh" size={14} color="#fff" />
                  <Text style={styles.actionButtonText}>{t('bluetooth.reconnect')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionButtonOutline, { borderColor: '#FF3B30' }]}
                onPress={handleForget}
              >
                <FontAwesome name="trash-o" size={14} color="#FF3B30" />
                <Text style={[styles.actionButtonOutlineText, { color: '#FF3B30' }]}>
                  {t('bluetooth.forget')}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.emptyDevice}>
            <FontAwesome name="bluetooth-b" size={24} color={palette.secondaryText} />
            <Text style={[styles.emptyDeviceText, { color: palette.secondaryText }]}>
              {t('bluetooth.noDeviceSelected')}
            </Text>
          </View>
        )}
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* SCAN SECTION */}
      {/* ------------------------------------------------------------------ */}
      <Text style={[styles.sectionHeader, { color: palette.secondaryText }]}>
        {t('bluetooth.scanForDevices')}
      </Text>
      <View style={[styles.card, { backgroundColor: palette.cardBackground, borderColor: palette.separator }]}>
        <TouchableOpacity
          style={[styles.scanButton, { backgroundColor: scanning ? palette.cardPressed : palette.tint }]}
          onPress={scanning ? stopScan : startScan}
          disabled={!bluetoothEnabled}
        >
          {scanning ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.scanButtonText}>{t('bluetooth.scanning')}</Text>
            </>
          ) : (
            <>
              <FontAwesome name="search" size={16} color="#fff" />
              <Text style={styles.scanButtonText}>{t('bluetooth.startScan')}</Text>
            </>
          )}
        </TouchableOpacity>

        {scanning && (
          <Text style={[styles.scanHint, { color: palette.secondaryText }]}>
            {t('bluetooth.scanningHint')}
          </Text>
        )}

        {/* Device List */}
        {devices.length > 0 && (
          <View style={styles.deviceList}>
            <View style={[styles.divider, { backgroundColor: palette.separator }]} />
            {devices.map((device, index) => (
              <React.Fragment key={device.id}>
                <TouchableOpacity
                  style={styles.deviceRow}
                  onPress={() => handleSelectDevice(device)}
                >
                  <View style={styles.deviceRowLeft}>
                    <FontAwesome name="bluetooth-b" size={16} color={palette.tint} />
                    <Text
                      style={[styles.deviceRowName, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}
                      numberOfLines={1}
                    >
                      {device.name ?? t('bluetooth.unknownDevice')}
                    </Text>
                  </View>
                  <View style={styles.deviceRowRight}>
                    <SignalBars rssi={device.rssi} color={palette.tint} />
                    <FontAwesome name="plus-circle" size={20} color={palette.tint} />
                  </View>
                </TouchableOpacity>
                {index < devices.length - 1 && (
                  <View style={[styles.dividerInset, { backgroundColor: palette.separator }]} />
                )}
              </React.Fragment>
            ))}
          </View>
        )}

        {!scanning && devices.length === 0 && (
          <Text style={[styles.noDevicesText, { color: palette.secondaryText }]}>
            {t('bluetooth.noDevicesFound')}
          </Text>
        )}
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* PAIR IN SYSTEM SETTINGS */}
      {/* ------------------------------------------------------------------ */}
      <Text style={[styles.sectionHeader, { color: palette.secondaryText }]}>
        {t('bluetooth.pairNewDevice')}
      </Text>
      <View style={[styles.card, { backgroundColor: palette.cardBackground, borderColor: palette.separator }]}>
        <Text style={[styles.pairHint, { color: palette.secondaryText }]}>
          {t('bluetooth.pairHint')}
        </Text>
        <TouchableOpacity
          style={[styles.settingsButton, { borderColor: palette.tint }]}
          onPress={openSettings}
        >
          <FontAwesome name="cog" size={16} color={palette.tint} />
          <Text style={[styles.settingsButtonText, { color: palette.tint }]}>
            {t('bluetooth.openSettings')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionHeader: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  // Current device
  currentDeviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 17,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 14,
  },
  currentDeviceActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionButtonOutlineText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyDevice: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  emptyDeviceText: {
    fontSize: 15,
    textAlign: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  dividerInset: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 44,
  },
  // Scan
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    margin: 12,
    borderRadius: 10,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scanHint: {
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 8,
  },
  deviceList: {
    // container for scanned devices
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  deviceRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  deviceRowName: {
    fontSize: 16,
    flex: 1,
  },
  deviceRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  signalBar: {
    width: 4,
    borderRadius: 1,
  },
  noDevicesText: {
    textAlign: 'center',
    fontSize: 14,
    padding: 16,
  },
  // Pair
  pairHint: {
    fontSize: 14,
    lineHeight: 20,
    padding: 14,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    margin: 12,
    marginTop: 0,
    borderRadius: 10,
    borderWidth: 1,
  },
  settingsButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
