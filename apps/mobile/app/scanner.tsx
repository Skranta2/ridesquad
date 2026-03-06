import React, { useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useTranslation } from '@/localization/i18n';
import { parseInviteLink } from '@/lib/database';

export default function ScannerScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();

  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false); // guard against double-fire

  const handleBarcodeScan = ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;

    const parsed = parseInviteLink(data);
    if (parsed) {
      router.replace({
        pathname: '/accept-invite',
        params: { type: parsed.type, token: parsed.token },
      } as any);
    } else {
      Alert.alert(t('common.error'), t('scanner.invalidQr'), [
        {
          text: t('common.retry'),
          onPress: () => {
            scannedRef.current = false;
          },
        },
        {
          text: t('common.cancel'),
          style: 'cancel',
          onPress: () => router.back(),
        },
      ]);
    }
  };

  // Still loading permissions
  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background ?? '#000' }]} />
    );
  }

  // Permission denied / not yet granted
  if (!permission.granted) {
    return (
      <View
        style={[styles.permissionContainer, { backgroundColor: palette.groupedBackground }]}
      >
        <FontAwesome name="camera" size={56} color={palette.tint} />
        <Text style={[styles.permissionTitle, { color: palette.text ?? '#000' }]}>
          {t('scanner.permissionTitle')}
        </Text>
        <Text style={[styles.permissionHint, { color: palette.secondaryText }]}>
          {t('scanner.permissionHint')}
        </Text>
        <TouchableOpacity
          style={[styles.grantButton, { backgroundColor: palette.tint }]}
          onPress={requestPermission}
        >
          <Text style={styles.grantButtonText}>{t('scanner.grantPermission')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={[styles.cancelText, { color: palette.secondaryText }]}>
            {t('common.cancel')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Camera active — show live viewfinder with overlay
  const FRAME = 240;

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarcodeScan}
      />

      {/* Darkened overlay with a transparent square cut-out */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {/* Top strip */}
        <View style={[styles.overlayStrip, { flex: 1 }]} />

        {/* Middle row: left | clear frame | right */}
        <View style={{ flexDirection: 'row', height: FRAME }}>
          <View style={[styles.overlayStrip, { flex: 1 }]} />
          {/* Clear scan area with corner markers */}
          <View style={{ width: FRAME, height: FRAME }}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
          <View style={[styles.overlayStrip, { flex: 1 }]} />
        </View>

        {/* Bottom strip */}
        <View style={[styles.overlayStrip, { flex: 1 }]} />
      </View>

      {/* Hint label below the scan frame */}
      <View style={styles.hintContainer} pointerEvents="none">
        <Text style={styles.hintText}>{t('scanner.hint')}</Text>
      </View>

      {/* Cancel button at the bottom */}
      <TouchableOpacity
        style={[styles.cancelBtn, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
        onPress={() => router.back()}
      >
        <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
      </TouchableOpacity>

      {/* Title at the top */}
      <View style={styles.titleContainer} pointerEvents="none">
        <Text style={styles.titleText}>{t('scanner.title')}</Text>
      </View>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionHint: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  grantButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 8,
  },
  grantButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 12,
  },
  cancelText: {
    fontSize: 16,
  },
  overlayStrip: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  // Corner markers
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#fff',
  },
  tl: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 4,
  },
  tr: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 4,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 4,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 4,
  },
  // Overlaid UI elements
  titleContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  titleText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 160,
    left: 32,
    right: 32,
    alignItems: 'center',
  },
  hintText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cancelBtn: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 24,
  },
  cancelBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
