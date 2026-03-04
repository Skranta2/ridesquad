// ============================================================================
// RideSquad Bluetooth Manager
// BLE service layer using react-native-ble-plx
// ============================================================================

import { Platform, PermissionsAndroid, Linking } from 'react-native';
import { BleManager, Device, State } from 'react-native-ble-plx';

// Singleton BleManager instance
let manager: BleManager | null = null;

function getManager(): BleManager {
  if (!manager) {
    manager = new BleManager();
  }
  return manager;
}

// ============================================================================
// PERMISSIONS
// ============================================================================

export async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    // iOS permissions are handled via Info.plist — BLE will prompt automatically
    return true;
  }

  if (Platform.OS === 'android') {
    if (Platform.Version >= 31) {
      // Android 12+ requires BLUETOOTH_SCAN and BLUETOOTH_CONNECT
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      return (
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === 'granted' &&
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === 'granted' &&
        results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === 'granted'
      );
    } else {
      // Android < 12 only needs location
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return result === 'granted';
    }
  }

  return false;
}

// ============================================================================
// BLUETOOTH STATE
// ============================================================================

export async function getBluetoothState(): Promise<State> {
  const mgr = getManager();
  return mgr.state();
}

export function onBluetoothStateChange(
  callback: (state: State) => void
): { remove: () => void } {
  const mgr = getManager();
  const subscription = mgr.onStateChange((state) => {
    callback(state);
  }, true); // true = emit current state immediately

  return {
    remove: () => subscription.remove(),
  };
}

// ============================================================================
// SCANNING
// ============================================================================

let scanTimeout: ReturnType<typeof setTimeout> | null = null;

export function startScan(
  onDeviceFound: (device: Device) => void,
  durationMs: number = 15000
): void {
  const mgr = getManager();

  // Stop any existing scan
  stopScan();

  mgr.startDeviceScan(
    null, // No service UUID filter — scan for all devices
    { allowDuplicates: false },
    (error, device) => {
      if (error) {
        console.error('BLE scan error:', error);
        return;
      }
      if (device) {
        onDeviceFound(device);
      }
    }
  );

  // Auto-stop after duration
  scanTimeout = setTimeout(() => {
    stopScan();
  }, durationMs);
}

export function stopScan(): void {
  const mgr = getManager();
  mgr.stopDeviceScan();

  if (scanTimeout) {
    clearTimeout(scanTimeout);
    scanTimeout = null;
  }
}

// ============================================================================
// CONNECTION
// ============================================================================

export async function connectToDevice(deviceId: string): Promise<Device> {
  const mgr = getManager();

  const device = await mgr.connectToDevice(deviceId, {
    timeout: 10000, // 10 second connection timeout
  });

  // Discover services (required after connect)
  await device.discoverAllServicesAndCharacteristics();

  return device;
}

export async function disconnectDevice(deviceId: string): Promise<void> {
  const mgr = getManager();
  await mgr.cancelDeviceConnection(deviceId);
}

export async function isDeviceConnected(deviceId: string): Promise<boolean> {
  const mgr = getManager();
  try {
    return await mgr.isDeviceConnected(deviceId);
  } catch {
    return false;
  }
}

// ============================================================================
// SYSTEM BLUETOOTH SETTINGS
// ============================================================================

export function openBluetoothSettings(): void {
  if (Platform.OS === 'ios') {
    // Opens iOS Settings app (closest to Bluetooth settings)
    Linking.openURL('App-Prefs:Bluetooth');
  } else {
    // Opens Android Bluetooth settings
    Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS').catch(() => {
      // Fallback for some Android versions
      Linking.openSettings();
    });
  }
}

// ============================================================================
// SIGNAL STRENGTH HELPER
// ============================================================================

/**
 * Convert RSSI to signal bars (0-3)
 * RSSI ranges: > -50 = excellent, -50 to -70 = good, -70 to -90 = fair, < -90 = weak
 */
export function rssiToSignalBars(rssi: number | null): number {
  if (rssi === null) return 0;
  if (rssi > -50) return 3;
  if (rssi > -70) return 2;
  if (rssi > -90) return 1;
  return 0;
}

// ============================================================================
// CLEANUP
// ============================================================================

export function destroyManager(): void {
  if (manager) {
    manager.destroy();
    manager = null;
  }
}
