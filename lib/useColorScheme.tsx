import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useNativewindColorScheme } from 'nativewind';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

export type ColorSchemeType = 'light' | 'dark' | 'oled';

export const OLED_STORAGE_KEY = 'kujira-oled-mode';

export async function getStoredOledMode(): Promise<boolean> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.localStorage.getItem(OLED_STORAGE_KEY) === '1';
  }
  const value = await AsyncStorage.getItem(OLED_STORAGE_KEY).catch(() => null);
  return value === '1';
}

type OledContextType = {
  isOled: boolean;
  setOled: (value: boolean) => void;
};

const OledContext = createContext<OledContextType>({
  isOled: false,
  setOled: () => {},
});

export function OledProvider({ children }: { children: React.ReactNode }) {
  const [isOled, setIsOled] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.localStorage.getItem(OLED_STORAGE_KEY) === '1';
    }
    return false;
  });

  useEffect(() => {
    if (Platform.OS === 'web') return;
    AsyncStorage.getItem(OLED_STORAGE_KEY)
      .then((value) => setIsOled(value === '1'))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.classList.toggle('oled', isOled);
  }, [isOled]);

  const setOled = useCallback((value: boolean) => {
    setIsOled(value);
    if (Platform.OS === 'web') {
      window.localStorage.setItem(OLED_STORAGE_KEY, value ? '1' : '0');
    } else {
      AsyncStorage.setItem(OLED_STORAGE_KEY, value ? '1' : '0').catch(() => {});
    }
  }, []);

  const value = useMemo(() => ({ isOled, setOled }), [isOled, setOled]);
  return <OledContext.Provider value={value}>{children}</OledContext.Provider>;
}

export function useColorScheme() {
  const { colorScheme, setColorScheme } = useNativewindColorScheme();
  const { isOled, setOled } = useContext(OledContext);

  const currentScheme: ColorSchemeType =
    colorScheme === 'light' ? 'light' : isOled ? 'oled' : 'dark';

  const setColorSchemeWithOled = useCallback((scheme: ColorSchemeType) => {
    if (scheme === 'oled') {
      setColorScheme('dark');
      setOled(true);
    } else {
      setColorScheme(scheme);
      setOled(false);
    }
  }, [setColorScheme, setOled]);

  const toggleColorScheme = useCallback(() => {
    if (currentScheme === 'light') setColorSchemeWithOled('dark');
    else if (currentScheme === 'dark') setColorSchemeWithOled('oled');
    else setColorSchemeWithOled('light');
  }, [currentScheme, setColorSchemeWithOled]);

  return {
    colorScheme: currentScheme,
    isDarkColorScheme: currentScheme !== 'light',
    isOledMode: currentScheme === 'oled',
    setColorScheme: setColorSchemeWithOled,
    toggleColorScheme,
  };
}
