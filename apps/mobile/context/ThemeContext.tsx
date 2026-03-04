import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { useAppSettings } from '../state/AppSettingsContext';

export type Colors = {
  primary: string;
  background: string;
  card: string;
  text: string;
  border: string;
  input: string;
  secondaryText: string;
  tabBar: string;
  tabBarActive: string;
};

const lightColors: Colors = {
  primary: '#007AFF',
  background: '#FFFFFF',
  card: '#F2F2F7',
  text: '#000000',
  border: '#C6C6C8',
  input: '#F2F2F7',
  secondaryText: '#8E8E93',
  tabBar: '#F2F2F7',
  tabBarActive: '#007AFF',
};

const darkColors: Colors = {
  primary: '#0A84FF',
  background: '#000000',
  card: '#1C1C1E',
  text: '#FFFFFF',
  border: '#38383A',
  input: '#2C2C2E',
  secondaryText: '#8E8E93',
  tabBar: '#1C1C1E',
  tabBarActive: '#0A84FF',
};

const ThemeContext = createContext<{
  colors: Colors;
  isDark: boolean;
} | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const { themeMode } = useAppSettings();
  
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colorScheme === 'dark');
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
