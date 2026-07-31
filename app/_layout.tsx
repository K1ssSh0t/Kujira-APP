import '~/global.css';

import { DarkTheme, DefaultTheme, Theme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { vars } from 'nativewind';
import * as React from 'react';
import { Appearance, Platform, View } from 'react-native';
import { NAV_THEME } from '~/lib/constants';
import { OledProvider, getStoredOledMode, useColorScheme } from '~/lib/useColorScheme';
import { PortalHost } from '@rn-primitives/portal';
import { ThemeToggle } from '~/components/ThemeToggle';
import { setAndroidNavigationBar } from '~/lib/android-navigation-bar';
import { Toaster } from 'sonner-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const LIGHT_THEME: Theme = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
};
const DARK_THEME: Theme = {
  ...DarkTheme,
  colors: NAV_THEME.dark,
};
const OLED_THEME: Theme = {
  ...DarkTheme,
  colors: NAV_THEME.oled,
};

const oledVars = vars({
  '--background': '0 0% 0%',
  '--foreground': '0 0% 98%',
  '--card': '0 0% 0%',
  '--card-foreground': '0 0% 98%',
  '--popover': '0 0% 0%',
  '--popover-foreground': '0 0% 98%',
  '--primary': '0 0% 98%',
  '--primary-foreground': '240 5.9% 10%',
  '--secondary': '0 0% 4%',
  '--secondary-foreground': '0 0% 98%',
  '--muted': '0 0% 4%',
  '--muted-foreground': '240 5% 64.9%',
  '--accent': '0 0% 4%',
  '--accent-foreground': '0 0% 98%',
  '--destructive': '0 72% 51%',
  '--destructive-foreground': '0 0% 98%',
  '--border': '0 0% 10%',
  '--input': '0 0% 10%',
  '--ring': '240 4.9% 83.9%',
});

export {
  ErrorBoundary,
} from 'expo-router';

const useIsomorphicLayoutEffect =
  Platform.OS === 'web' && typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

const usePlatformSpecificSetup = Platform.select({
  web: useSetWebBackgroundClassName,
  android: useSetAndroidNavigationBar,
  default: noop,
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <OledProvider>
        <RootLayoutContent />
      </OledProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutContent() {
  usePlatformSpecificSetup();
  const { colorScheme, isOledMode } = useColorScheme();

  const navTheme =
    colorScheme === 'oled' ? OLED_THEME :
    colorScheme === 'dark' ? DARK_THEME :
    LIGHT_THEME;

  return (
    <ThemeProvider value={navTheme}>
      <View style={isOledMode ? oledVars : undefined} className='flex-1'>
        <StatusBar style={colorScheme === 'light' ? 'dark' : 'light'} />
        <Stack>
          <Stack.Screen name='index' options={{ headerShown: false }} />
          <Stack.Screen
            name='(tabs)'
            options={{
              title: 'Kujira APP',
              headerRight: () => <ThemeToggle />,
            }}
          />
          <Stack.Screen
            name='episode'
            options={{
              title: 'Episode',
              headerRight: () => <ThemeToggle />,
            }}
          />
          <Stack.Screen
            name='anime-details'
            options={{
              title: 'Anime Details',
              headerRight: () => <ThemeToggle />,
            }}
          />
          <Stack.Screen
            name='auth-callback'
            options={{
              title: 'Authenticating...',
              headerShown: false,
            }}
          />
        </Stack>
        <PortalHost />
        <Toaster />
      </View>
    </ThemeProvider>
  );
}

function useSetWebBackgroundClassName() {
  useIsomorphicLayoutEffect(() => {
    document.documentElement.classList.add('bg-background');
  }, []);
}

function useSetAndroidNavigationBar() {
  React.useLayoutEffect(() => {
    getStoredOledMode().then((isOled) => {
      if (isOled) {
        setAndroidNavigationBar('oled');
      } else {
        setAndroidNavigationBar(Appearance.getColorScheme() ?? 'light');
      }
    });
  }, []);
}

function noop() { }
