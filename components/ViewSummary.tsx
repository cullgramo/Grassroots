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
 * so nobody is left wondering why a fixture is missing. Tap place or date to change them, age to cycle it.
 */
export function ViewSummary() {
  const t = useTheme();
  const { filters, location, setMyAge, showAllIreland, viewNote, dismissViewNote } = useApp();
  const parts = describeView(filters, location != null);
  const limited = isLimited(filters, location != null);
  const placeLimited = filters.county != null || (filters.distanceKm != null && location != null);

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {parts.map((p) => (
          <Chip
            key={p.id}
            label={p.label}
            elevated
            onPress={() => (p.id === 'age' ? setMyAge(NEXT_AGE[filters.age ?? 'all']) : router.push('/filters'))}
          />
        ))}
        {limited ? <Chip label={placeLimited ? 'All Ireland' : 'Any date'} elevated onPress={showAllIreland} /> : null}
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
  row: { gap: 8, paddingHorizontal: 16, paddingBottom: 2 },
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
