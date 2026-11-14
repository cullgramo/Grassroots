import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useApp } from '@/context/AppContext';
import type { AgeFilter } from '@/utils/ageGroup';
import { describeView, isLimited } from '@/utils/view';
import { Chip } from './Chip';
import { useTheme } from './useTheme';

const NEXT_AGE: Record<AgeFilter, AgeFilter> = { all: 'adult', adult: 'underage', underage: 'all' };

/**
 * One line under the search bar saying what the map is showing ("Within 25 km of you · This weekend · Adult"),
 * so nobody is left wondering why a fixture is missing. Tap it to change the place or date. The age chip appears
 * only when an age is chosen, and tapping it cycles Adult, Underage, All ages.
 */
export function ViewSummary() {
  const t = useTheme();
  const { filters, location, setMyAge, showAllIreland, viewNote, dismissViewNote } = useApp();
  const hasLocation = location != null;
  const [place, when, age] = describeView(filters, hasLocation);
  const placeLimited = filters.county != null || (filters.distanceKm != null && hasLocation);
  // Place and date read as one phrase. Age only shows when it narrows things, so the usual view is one chip.
  const ageOn = (filters.age ?? 'all') !== 'all';

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.row}>
        <Chip compact elevated label={`${place.label} · ${when.label}`} onPress={() => router.push('/filters')} />
        {ageOn ? <Chip compact elevated selected label={age.label} onPress={() => setMyAge(NEXT_AGE[filters.age ?? 'all'])} /> : null}
        {isLimited(filters, hasLocation) ? (
          <Chip compact elevated label={placeLimited ? 'All Ireland' : 'Any date'} onPress={showAllIreland} />
        ) : null}
      </ScrollView>
      {viewNote ? (
        <View style={[styles.note, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[styles.noteText, { color: t.text }]}>{viewNote}</Text>
          <Pressable onPress={dismissViewNote} accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={12}>
            <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} tintColor={t.muted} size={16} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // flexGrow 0 stops the row stretching into the chips beneath it; the wrapper keeps a clear gap.
  scroll: { flexGrow: 0 },
  row: { gap: 8, paddingHorizontal: 16, paddingVertical: 4 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  noteText: { flex: 1, fontSize: 13, fontWeight: '600' },
});
