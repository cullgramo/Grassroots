import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useApp } from '@/context/AppContext';
import type { Sort } from '@/utils/filterFixtures';
import { useTheme } from './useTheme';

const CHOICES: { value: Sort; label: string }[] = [
  { value: 'time', label: 'Time' },
  { value: 'nearest', label: 'Nearest' },
];

/** Puts the list in time order or nearest first. Shown only when the phone's location is known: there is no "nearest" without it. */
export function SortSwitch() {
  const t = useTheme();
  const { sort, setSort, location } = useApp();
  if (!location) return null;
  return (
    <View style={[styles.wrap, { backgroundColor: t.card, borderColor: t.border }]} accessibilityRole="radiogroup" accessibilityLabel="List order">
      {CHOICES.map((c) => {
        const on = sort === c.value;
        return (
          <Pressable
            key={c.value}
            onPress={() => setSort(c.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={c.value === 'time' ? 'In time order' : 'Nearest first'}
            hitSlop={{ top: 8, bottom: 8 }}
            // The tint with a little of its strength, as a wash behind the chosen word.
            style={[styles.choice, on && { backgroundColor: `${t.tint}24` }]}>
            <Text style={[styles.label, { color: on ? t.tint : t.muted }]}>{c.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderWidth: 1, borderRadius: 17, padding: 2 },
  choice: { height: 28, paddingHorizontal: 11, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12.5, fontWeight: '800' },
});
