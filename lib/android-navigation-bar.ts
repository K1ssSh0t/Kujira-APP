import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';
import { NAV_THEME } from '~/lib/constants';

export async function setAndroidNavigationBar(theme: 'light' | 'dark' | 'oled') {
  if (Platform.OS !== 'android') return;
  const isDark = theme === 'dark' || theme === 'oled';
  await NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
  await NavigationBar.setBackgroundColorAsync(
    isDark
      ? theme === 'oled'
        ? NAV_THEME.oled.background
        : NAV_THEME.dark.background
      : NAV_THEME.light.background
  );
}
