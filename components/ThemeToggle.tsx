import { Pressable, View } from 'react-native';
import { setAndroidNavigationBar } from '~/lib/android-navigation-bar';
import { Moon } from '~/lib/icons/Moon';
import { MoonStar } from '~/lib/icons/MoonStar';
import { Sun } from '~/lib/icons/Sun';
import { useColorScheme } from '~/lib/useColorScheme';

export function ThemeToggle() {
  const { colorScheme, setColorScheme } = useColorScheme();

  function toggleColorScheme() {
    if (colorScheme === 'light') {
      setColorScheme('dark');
      setAndroidNavigationBar('dark');
    } else if (colorScheme === 'dark') {
      setColorScheme('oled');
      setAndroidNavigationBar('oled');
    } else {
      setColorScheme('light');
      setAndroidNavigationBar('light');
    }
  }

  return (
    <Pressable
      onPress={toggleColorScheme}
      className='web:ring-offset-background web:transition-colors web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2 active:opacity-70 active:scale-95'
    >
      <View className='w-10 h-10 rounded-full bg-secondary border border-border items-center justify-center web:px-5'>
        {colorScheme === 'oled' ? (
          <Moon className='text-foreground' size={18} strokeWidth={2} />
        ) : colorScheme === 'dark' ? (
          <MoonStar className='text-foreground' size={18} strokeWidth={2} />
        ) : (
          <Sun className='text-foreground' size={18} strokeWidth={2} />
        )}
      </View>
    </Pressable>
  );
}
