import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useApp } from '@/context/AppContext';
import { widerDistance } from '@/utils/filterFixtures';
import { useTheme } from './useTheme';

/** Explains why no fixtures are showing and offers the one action most likely to fix it. */
export function EmptyState({ onShowAll }: { onShowAll: () => void }) {
  const t = useTheme();
  const { fixtures, filters, location, setFilters, resetFilters, loadState, refresh } = useApp();

  let title = 'No fixtures in this area';
  let action = `Show all ${fixtures.length} fixtures`;
  let run = onShowAll;

  if (loadState === 'loading') {
    return (
      <View style={styles.box}>
        <Text style={[styles.title, { color: t.text }]}>Loading fixtures…</Text>
      </View>
    );
  }

  if (loadState === 'error') {
    title = "Couldn't load fixtures";
    action = 'Try again';
    run = refresh;
  } else if (fixtures.length === 0) {
    if (filters.distanceKm != null && location) {
      const wider = widerDistance(filters.distanceKm);
      title = `No fixtures within ${filters.distanceKm}km`;
      action = wider ? `Widen to ${wider}km` : 'Search any distance';
      run = () => setFilters({ distanceKm: wider });
    } else {
      title = 'No fixtures match these filters';
      action = 'Clear filters';
      run = resetFilters;
    }
  }

  return (
    <View style={styles.box}>
      <Text style={[styles.title, { color: t.text }]}>{title}</Text>
      <Pressable onPress={run} accessibilityRole="button" style={[styles.button, { backgroundColor: t.tint }]}>
        <Text style={[styles.buttonText, { color: t.onTint }]}>{action}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', padding: 18, gap: 12 },
  title: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  button: { minHeight: 44, borderRadius: 22, paddingHorizontal: 20, justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '800' },
});
