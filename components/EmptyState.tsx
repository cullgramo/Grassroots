import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getSport } from '@/constants/sports';
import { useApp } from '@/context/AppContext';
import { widerDistance } from '@/utils/filterFixtures';
import { useTheme } from './useTheme';

/** Explains why no fixtures are showing and offers the one action most likely to fix it. */
export function EmptyState({ onShowAll }: { onShowAll: () => void }) {
  const t = useTheme();
  const { fixtures, upcoming, mySports, filters, location, setFilters, resetFilters, loadState, refresh } = useApp();

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
      // Say which limit is the cause and offer the one step that lifts it, instead of a reset that lands on the same view.
      const sportIds = filters.sport ? [filters.sport] : filters.group ? null : !filters.allSports && mySports.length > 0 ? mySports : null;
      const noneInSport = sportIds != null && !upcoming.some((f) => sportIds.includes(f.sport));
      if (noneInSport) {
        const names = sportIds.map((id) => getSport(id).name);
        title = `No ${names.length <= 2 ? names.join(' or ') : 'fixtures for your sports'} ${names.length <= 2 ? 'fixtures ' : ''}listed yet`;
        action = 'Show every sport';
        run = () => setFilters({ sport: null, group: null, allSports: true });
      } else if (filters.when !== 'any') {
        title = filters.when === 'today' ? 'Nothing on today' : filters.when === 'weekend' ? 'Nothing on this weekend' : 'Nothing on in the next 7 days';
        action = 'Show any date';
        run = () => setFilters({ when: 'any' });
      } else if (filters.county) {
        title = `No fixtures in ${filters.county}`;
        action = 'Show all Ireland';
        run = () => setFilters({ county: null });
      } else {
        title = 'No fixtures match these filters';
        action = 'Clear filters';
        run = resetFilters;
      }
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
