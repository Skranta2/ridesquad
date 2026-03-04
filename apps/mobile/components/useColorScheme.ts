import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useAppSettings } from '@/state/AppSettingsContext';

export function useColorScheme() {
  const system = useSystemColorScheme();
  const { themeMode } = useAppSettings();

  if (themeMode === 'system') return system;
  return themeMode;
}
