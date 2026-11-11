import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';

export function useTheme() {
  return Colors[useColorScheme()];
}
