import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from './useTheme';

interface ChipProps {
  label: string;
  selected?: boolean;
  dotColor?: string;
  onPress: () => void;
  elevated?: boolean;
}

export function Chip({ label, selected, dotColor, onPress, elevated }: ChipProps) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={[
        styles.chip,
        { backgroundColor: selected ? t.tint : t.card, borderColor: selected ? t.tint : t.border },
        elevated && styles.elevated,
      ]}>
      {dotColor && !selected ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
      <Text style={[styles.label, { color: selected ? t.onTint : t.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  elevated: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 7 },
  label: { fontSize: 14, fontWeight: '600' },
});
