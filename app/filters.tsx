import { router } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { useTheme } from '@/components/useTheme';
import { getSport } from '@/constants/sports';
import { useApp } from '@/context/AppContext';
import { legalReady } from '@/constants/legal';
import type { Level } from '@/types/fixture';
import { AGE_LABEL, type AgeFilter } from '@/utils/ageGroup';
import { GENDER_LABEL, isWomensCode, type GenderFilter } from '@/utils/category';
import { unlabelledCount } from '@/utils/filterFixtures';

const LEVELS: Level[] = ['Local', 'Top level'];
const AGES: AgeFilter[] = ['all', 'adult', 'underage'];
const GENDERS: GenderFilter[] = ['all', 'men', 'women'];

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
  const { filters, setFilters, resetFilters, fixtures, allFixtures, location, mySports, setMyAge, setMyGender } = useApp();
  // Camogie and ladies football are women's games already, so there is nothing to split.
  const womensOnly = isWomensCode(filters.sport);
  const unlabelled = useMemo(
    () => unlabelledCount(allFixtures, filters, location, new Date(), mySports),
    [allFixtures, filters, location, mySports]
  );

  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Sport, place and date are chosen with the controls over the map; this screen holds the rest. */}
        <Section title="Age">
          {AGES.map((a) => (
            <Chip key={a} label={AGE_LABEL[a]} selected={filters.age === a} onPress={() => setMyAge(a)} />
          ))}
          <Text style={[styles.note, { color: t.muted }]}>Underage includes schools games. Remembered for next time.</Text>
        </Section>

        <Section title="Men & women">
          {womensOnly ? (
            <Text style={[styles.note, { color: t.muted }]}>{getSport(filters.sport!).name} is played by women and girls.</Text>
          ) : (
            <>
              {GENDERS.map((g) => (
                <Chip key={g} label={GENDER_LABEL[g]} selected={(filters.gender ?? 'all') === g} onPress={() => setMyGender(g)} />
              ))}
              <Text style={[styles.note, { color: t.muted }]}>
                {unlabelled > 0
                  ? `${unlabelled} ${unlabelled === 1 ? 'fixture' : 'fixtures'} here ${unlabelled === 1 ? 'is' : 'are'} not labelled men or women, so only show under All. `
                  : ''}
                Mixed games show under both. Remembered for next time.
              </Text>
            </>
          )}
        </Section>

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

        <Pressable onPress={() => router.push('/credits')} accessibilityRole="link" style={styles.adminLink}>
          <Text style={[styles.note, { color: t.muted }]}>Credits: where the fixtures and maps come from</Text>
        </Pressable>
        {legalReady() ? (
          <>
            <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link" style={styles.adminLink}>
              <Text style={[styles.note, { color: t.muted }]}>Privacy</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/terms')} accessibilityRole="link" style={styles.adminLink}>
              <Text style={[styles.note, { color: t.muted }]}>Terms of use</Text>
            </Pressable>
          </>
        ) : null}
        {__DEV__ ? (
          <Pressable onPress={() => router.push('/admin')} accessibilityRole="link" style={styles.adminLink}>
            <Text style={[styles.note, { color: t.muted }]}>Add fixtures (admin)</Text>
          </Pressable>
        ) : null}
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
