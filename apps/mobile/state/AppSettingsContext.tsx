import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';
export type LanguageCode = 'sv' | 'en' | 'fi' | 'no' | 'de' | 'es';

type AppSettings = {
  loaded: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
};

const AppSettingsContext = createContext<AppSettings | null>(null);

const STORAGE_KEYS = {
  themeMode: 'ridesquad.themeMode',
  language: 'ridesquad.language',
} as const;

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

function isLanguageCode(value: unknown): value is LanguageCode {
  return value === 'sv' || value === 'en' || value === 'fi' || value === 'no' || value === 'de' || value === 'es';
}

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [language, setLanguage] = useState<LanguageCode>('en');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [storedThemeMode, storedLanguage] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.themeMode),
          AsyncStorage.getItem(STORAGE_KEYS.language),
        ]);

        if (isMounted) {
          if (storedThemeMode && isThemeMode(storedThemeMode)) {
            setThemeMode(storedThemeMode);
          }
          if (storedLanguage && isLanguageCode(storedLanguage)) {
            setLanguage(storedLanguage);
          }
          setLoaded(true);
        }
      } catch {
        if (isMounted) {
          setLoaded(true);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.themeMode, themeMode).catch(() => undefined);
  }, [loaded, themeMode]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.language, language).catch(() => undefined);
  }, [loaded, language]);

  const value = useMemo(
    () => ({
      loaded,
      themeMode,
      setThemeMode,
      language,
      setLanguage,
    }),
    [loaded, themeMode, language]
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }
  return ctx;
}
