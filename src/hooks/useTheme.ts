import { useColorScheme } from 'react-native';
import { Colors, ThemeColors } from '@/src/constants/colors';
import { useSettingsStore } from '@/src/stores/settingsStore';

export function useTheme(): ThemeColors {
  const systemScheme = useColorScheme();
  const darkMode = useSettingsStore((s) => s.darkMode);

  // Use manual override if set, otherwise follow system
  const scheme: 'light' | 'dark' = darkMode ? 'dark' : (systemScheme === 'dark' ? 'dark' : 'light');
  return Colors[scheme];
}
