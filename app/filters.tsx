import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { FixtureMap } from '@/components/FixtureMap';
import { useTheme } from '@/components/useTheme';
import { getSport } from '@/constants/sports';
import { useApp } from '@/context/AppContext';
import { COUNTIES } from '@/data/counties';
import type { Level, When } from '@/types/fixture';
import { AGE_LABEL, type AgeFilter } from '@/utils/ageGroup';

const WHEN: { value: When; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: 'weekend', label: 'This weekend' },
  { value: 'week', label: 'Next 7 days' },
];
const LEVELS: Level[] = ['Local', 'Top level'];
const AGES: AgeFilter[] = ['all', 'adult', 'underage'];
const DISTANCES = [5, 10, 25, 50, 100];

function Section({ title, children }: { title: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: t.text }]}>{title}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

export default function FiltersScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { filters, setFilters, resetFilters, fixtures, location, requestLocation, mySports, setMyAge } = useApp();

  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.map}>
          <FixtureMap
            fixtures={fixtures}
            selectedId={null}
            userLocation={location}
            radiusKm={filters.distanceKm}
            fitRadius
            interactive={false}
          />
        </View>

        <Section title="Distance from you">
          {location ? (
            <>
              <Chip label="Any distance" selected={filters.distanceKm == null} onPress={() => setFilters({ distanceKm: null })} />
              {DISTANCES.map((d) => (
                <Chip key={d} label={`${d}km`} selected={filters.distanceKm === d} onPress={() => setFilters({ distanceKm: d })} />
              ))}
            </>
          ) : (
            <View style={styles.locationNote}>
              <Text style={[styles.note, { color: t.muted }]}>
                Turn on location to find fixtures near you.
              </Text>
              <Chip label="Use my location" onPress={requestLocation} />
            </View>
          )}
        </Section>

        <Section title="When">
          {WHEN.map((w) => (
            <Chip key={w.value} label={w.label} selected={filters.when === w.value} onPress={() => setFilters({ when: w.value })} />
          ))}
        </Section>

        <Section title="Age">
          {AGES.map((a) => (
            <Chip key={a} label={AGE_LABEL[a]} selected={filters.age === a} onPress={() => setMyAge(a)} />
          ))}
          <Text style={[styles.note, { color: t.muted }]}>Underage includes schools games. Remembered for next time.</Text>
        </Section>

        <Text style={[styles.more, { color: t.muted }]}>MORE FILTERS</Text>

        <Section title="Level">
          <Chip label="All levels" selected={!filters.level} onPress={() => setFilters({ level: null })} />
          {LEVELS.map((l) => (
            <Chip key={l} label={l} selected={filters.level === l} onPress={() => setFilters({ level: l })} />
          ))}
        </Section>

        <Section title="My sports">
          <Text style={[styles.note, { color: t.muted }]}>
            {mySports.length === 0 ? 'Every sport' : mySports.map((id) => getSport(id).name).join(', ')}
          </Text>
          <Chip label="Change my sports" onPress={() => router.push('/sports')} />
        </Section>

        <Section title="County">
          <Chip label="All counties" selected={!filters.county} onPress={() => setFilters({ county: null })} />
          {COUNTIES.map((c) => (
            <Chip key={c} label={c} selected={filters.county === c} onPress={() => setFilters({ county: c })} />
          ))}
        </Section>
        <Pressable onPress={() => router.push('/admin')} accessibilityRole="link" style={styles.adminLink}>
          <Text style={[styles.note, { color: t.muted }]}>Add fixtures (admin)</Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: t.card, borderColor: t.border, paddingBottom: insets.bottom + 12 }]}>
        <Pressable onPress={resetFilters} accessibilityRole="button" style={styles.reset}>
          <Text style={[styles.resetText, { color: t.text }]}>Reset</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={[styles.apply, { backgroundColor: t.tint }]}>
          <Text style={[styles.applyText, { color: t.onTint }]}>
            Show {fixtures.length} {fixtures.length === 1 ? 'fixture' : 'fixtures'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  map: { height: 200, borderRadius: 18, overflow: 'hidden', marginBottom: 20 },
  more: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginBottom: 14 },
  adminLink: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  locationNote: { gap: 10, alignItems: 'flex-start' },
  note: { fontSize: 14 },
  footer: { flexDirection: 'row', gap: 12, padding: 12, borderTopWidth: 1 },
  reset: { minHeight: 48, paddingHorizontal: 20, justifyContent: 'center' },
  resetText: { fontSize: 16, fontWeight: '700' },
  apply: { flex: 1, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  applyText: { fontSize: 16, fontWeight: '800' },
});
