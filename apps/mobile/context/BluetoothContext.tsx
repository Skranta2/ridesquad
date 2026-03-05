// ============================================================================
// RideSquad Bluetooth Context
// Provides useBluetooth() hook for device scanning, connection, and preferences
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { State, Device } from 'react-native-ble-plx';

import {
  requestBluetoothPermissions,
  getBluetoothState,
  onBluetoothStateChange,
  startScan as bleStartScan,
  stopScan as bleStopScan,
  connectToDevice,
  disconnectDevice,
  isDeviceConnected,
  openBluetoothSettings,
  destroyManager,
  isBleSupported,
} from '@/lib/bluetoothManager';

// ============================================================================
// TYPES
// ============================================================================

export interface DiscoveredDevice {
  id: string;
  name: string | null;
  rssi: number | null;
}

interface BluetoothContextValue {
  // Discovered devices from scanning
  devices: DiscoveredDevice[];

  // Currently connected device (may be null)
  connectedDeviceId: string | null;
  connectedDeviceName: string | null;

  // Saved preferred device (persisted in AsyncStorage)
  preferredDeviceId: string | null;
  preferredDeviceName: string | null;

  // State
  scanning: boolean;
  bluetoothEnabled: boolean;
  permissionsGranted: boolean;
  isConnected: boolean;

  // Actions
  startScan: () => Promise<void>;
  stopScan: () => void;
  selectDevice: (device: DiscoveredDevice) => Promise<void>;
  forgetDevice: () => Promise<void>;
  reconnect: () => Promise<void>;
  openSettings: () => void;
  requestPermissions: () => Promise<boolean>;
}

const STORAGE_KEY_DEVICE_ID = '@ridesquad/bluetooth_device_id';
const STORAGE_KEY_DEVICE_NAME = '@ridesquad/bluetooth_device_name';

// ============================================================================
// CONTEXT
// ============================================================================

const BluetoothContext = createContext<BluetoothContextValue | null>(null);

export function useBluetooth(): BluetoothContextValue {
  const ctx = useContext(BluetoothContext);
  if (!ctx) {
    throw new Error('useBluetooth must be used within a BluetoothProvider');
  }
  return ctx;
}

// ============================================================================
// PROVIDER
// ============================================================================

export function BluetoothProvider({ children }: { children: React.ReactNode }) {
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  // Preferred device (saved in AsyncStorage)
  const [preferredDeviceId, setPreferredDeviceId] = useState<string | null>(null);
  const [preferredDeviceName, setPreferredDeviceName] = useState<string | null>(null);

  // Connected device (runtime)
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);
  const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Track discovered devices by ID to deduplicate
  const devicesMapRef = useRef<Map<string, DiscoveredDevice>>(new Map());

  // --------------------------------------------------------------------------
  // Load preferred device from storage on mount
  // --------------------------------------------------------------------------
  useEffect(() => {
    async function loadPreferred() {
      try {
        const [id, name] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_DEVICE_ID),
          AsyncStorage.getItem(STORAGE_KEY_DEVICE_NAME),
        ]);
        if (id) {
          setPreferredDeviceId(id);
          setPreferredDeviceName(name);
        }
      } catch (err) {
        console.error('Error loading preferred BT device:', err);
      }
    }
    loadPreferred();
  }, []);

  // --------------------------------------------------------------------------
  // Monitor Bluetooth state (no-op on simulator — isBleSupported() is false)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!isBleSupported()) return; // Simulator / unsupported device

    const subscription = onBluetoothStateChange((state) => {
      setBluetoothEnabled(state === State.PoweredOn);
    });

    return () => subscription.remove();
  }, []);

  // --------------------------------------------------------------------------
  // Check connection status of preferred device periodically
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!preferredDeviceId || !bluetoothEnabled) {
      setIsConnected(false);
      return;
    }

    let isMounted = true;

    async function checkConnection() {
      try {
        const connected = await isDeviceConnected(preferredDeviceId!);
        if (isMounted) {
          setIsConnected(connected);
          if (connected) {
            setConnectedDeviceId(preferredDeviceId);
            setConnectedDeviceName(preferredDeviceName);
          } else {
            setConnectedDeviceId(null);
            setConnectedDeviceName(null);
          }
        }
      } catch {
        if (isMounted) {
          setIsConnected(false);
        }
      }
    }

    checkConnection();
    const interval = setInterval(checkConnection, 10000); // Check every 10s

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [preferredDeviceId, preferredDeviceName, bluetoothEnabled]);

  // --------------------------------------------------------------------------
  // ACTIONS
  // --------------------------------------------------------------------------

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const granted = await requestBluetoothPermissions();
    setPermissionsGranted(granted);
    return granted;
  }, []);

  const startScan = useCallback(async () => {
    // Request permissions first
    const granted = await requestPermissions();
    if (!granted) return;

    // Check BT state
    const state = await getBluetoothState();
    if (state !== State.PoweredOn) {
      setBluetoothEnabled(false);
      return;
    }

    // Clear previous results
    devicesMapRef.current.clear();
    setDevices([]);
    setScanning(true);

    bleStartScan((device: Device) => {
      // Only include devices with a name (filters out unnamed beacons/sensors)
      const name = device.name || device.localName;
      if (!name) return;

      const discovered: DiscoveredDevice = {
        id: device.id,
        name,
        rssi: device.rssi,
      };

      devicesMapRef.current.set(device.id, discovered);

      // Update state with sorted list (strongest signal first)
      const sorted = Array.from(devicesMapRef.current.values()).sort((a, b) => {
        return (b.rssi ?? -100) - (a.rssi ?? -100);
      });
      setDevices(sorted);
    }, 15000);

    // Auto-set scanning to false after 15s
    setTimeout(() => {
      setScanning(false);
    }, 15000);
  }, [requestPermissions]);

  const stopScan = useCallback(() => {
    bleStopScan();
    setScanning(false);
  }, []);

  const selectDevice = useCallback(async (device: DiscoveredDevice) => {
    try {
      // Try connecting via BLE
      await connectToDevice(device.id);

      // Save as preferred
      setPreferredDeviceId(device.id);
      setPreferredDeviceName(device.name);
      setConnectedDeviceId(device.id);
      setConnectedDeviceName(device.name);
      setIsConnected(true);

      await AsyncStorage.setItem(STORAGE_KEY_DEVICE_ID, device.id);
      if (device.name) {
        await AsyncStorage.setItem(STORAGE_KEY_DEVICE_NAME, device.name);
      }
    } catch (err) {
      // Even if BLE connect fails, save as preferred
      // (user may pair via OS Settings for Classic BT audio)
      setPreferredDeviceId(device.id);
      setPreferredDeviceName(device.name);

      await AsyncStorage.setItem(STORAGE_KEY_DEVICE_ID, device.id);
      if (device.name) {
        await AsyncStorage.setItem(STORAGE_KEY_DEVICE_NAME, device.name);
      }

      console.warn('BLE connect failed (device may use Classic BT):', err);
    }
  }, []);

  const forgetDevice = useCallback(async () => {
    if (connectedDeviceId) {
      try {
        await disconnectDevice(connectedDeviceId);
      } catch {
        // Ignore disconnect errors
      }
    }

    setPreferredDeviceId(null);
    setPreferredDeviceName(null);
    setConnectedDeviceId(null);
    setConnectedDeviceName(null);
    setIsConnected(false);

    await AsyncStorage.removeItem(STORAGE_KEY_DEVICE_ID);
    await AsyncStorage.removeItem(STORAGE_KEY_DEVICE_NAME);
  }, [connectedDeviceId]);

  const reconnect = useCallback(async () => {
    if (!preferredDeviceId) return;

    try {
      await connectToDevice(preferredDeviceId);
      setConnectedDeviceId(preferredDeviceId);
      setConnectedDeviceName(preferredDeviceName);
      setIsConnected(true);
    } catch (err) {
      console.warn('Reconnect failed:', err);
      setIsConnected(false);
    }
  }, [preferredDeviceId, preferredDeviceName]);

  const openSettings = useCallback(() => {
    openBluetoothSettings();
  }, []);

  // --------------------------------------------------------------------------
  // Cleanup on unmount
  // --------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      bleStopScan();
      // Don't destroy manager on unmount — it may still be needed
    };
  }, []);

  const value: BluetoothContextValue = {
    devices,
    connectedDeviceId,
    connectedDeviceName,
    preferredDeviceId,
    preferredDeviceName,
    scanning,
    bluetoothEnabled,
    permissionsGranted,
    isConnected,
    startScan,
    stopScan,
    selectDevice,
    forgetDevice,
    reconnect,
    openSettings,
    requestPermissions,
  };

  return (
    <BluetoothContext.Provider value={value}>
      {children}
    </BluetoothContext.Provider>
  );
}
