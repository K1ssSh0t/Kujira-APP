import { useColorScheme as useNativewindColorScheme } from 'nativewind';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Platform } from 'react-native';

export type ColorSchemeType = 'light' | 'dark' | 'oled';

type OledContextType = {
  isOled: boolean;
  setOled: (value: boolean) => void;
};

const OledContext = createContext<OledContextType>({
  isOled: false,
  setOled: () => {},
});

export function OledProvider({ children }: { children: React.ReactNode }) {
  const [isOled, setOled] = useState(() => {
    if (Platform.OS === 'web') {
      return document.documentElement.classList.contains('oled');
    }
    return false;
  });

  const value = useMemo(() => ({ isOled, setOled }), [isOled]);
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
      if (Platform.OS === 'web') {
        document.documentElement.classList.add('oled');
      }
    } else {
      setColorScheme(scheme);
      setOled(false);
      if (Platform.OS === 'web') {
        document.documentElement.classList.remove('oled');
      }
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
