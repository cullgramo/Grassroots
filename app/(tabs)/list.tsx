import { router } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClubMatches } from '@/components/ClubMatches';
import { EmptyState } from '@/components/EmptyState';
import { FixtureRow } from '@/components/FixtureRow';
import { MapControls } from '@/components/MapControls';
import { SortSwitch } from '@/components/SortSwitch';
import { useTheme } from '@/components/useTheme';
import { useApp } from '@/context/AppContext';
import { searchFixtures, toListSections } from '@/utils/filterFixtures';

/** Every fixture as a plain list, soonest first, with its own search bar. */
export default function ListScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { fixtures, upcoming, filters, location, sort, loadState, isStale, refreshing, refresh } = useApp();
  const [query, setQuery] = useState('');

  // A search looks through every upcoming fixture in Ireland, not only the current view.
  // The search itself runs a beat behind the typing, so each keystroke shows at once even with thousands of fixtures.
  const slowQuery = useDeferredValue(query);
  const shown = useMemo(() => (slowQuery.trim() ? searchFixtures(upcoming, slowQuery) : fixtures), [fixtures, upcoming, slowQuery]);
  const sections = useMemo(() => toListSections(shown, sort, location), [shown, sort, location]);
  // Nearest first mixes days together, so each row then says its own day (unless only one day is showing).
  const oneDay = (filters.when === 'today' || filters.when === 'day') && !query.trim();
  const showDay = sort === 'nearest' && location != null && !oneDay;
  const count = shown.length;
  const summary =
    loadState === 'loading'
      ? 'Loading fixtures…'
      : loadState === 'error'
        ? "Couldn't load fixtures"
        : query.trim()
          ? `${count} ${count === 1 ? 'result' : 'results'} for “${query.trim()}”`
          : `${count} ${count === 1 ? 'fixture' : 'fixtures'}`;

  return (
    <View style={[styles.screen, { backgroundColor: t.background, paddingTop: insets.top + 8 }]}>
      <MapControls query={query} onChangeQuery={setQuery} />
      <SectionList
        sections={sections}
        keyExtractor={(f) => f.id}
        stickySectionHeadersEnabled={false}
        refreshing={refreshing}
        onRefresh={refresh}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summary, { color: t.text }]} numberOfLines={1}>
                {isStale && loadState === 'ready' ? `${summary} · offline, last saved copy` : summary}
              </Text>
              <SortSwitch />
            </View>
            {query.trim() ? <ClubMatches query={query} /> : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionRow, { backgroundColor: t.background }]}>
            <Text style={[styles.section, { color: t.muted }]} numberOfLines={1}>{section.title.toUpperCase()}</Text>
            <Text style={[styles.sectionCount, { color: t.muted }]}>
              {section.data.length} {section.data.length === 1 ? 'fixture' : 'fixtures'}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <FixtureRow
              fixture={item}
              showDay={showDay}
              onPress={() => router.push({ pathname: '/fixture/[id]', params: { id: item.id } })}
            />
          </View>
        )}
        ListEmptyComponent={loadState === 'ready' ? <EmptyState onShowAll={() => setQuery('')} /> : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { paddingHorizontal: 10, paddingBottom: 24 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 36, marginTop: 10, marginBottom: 6, paddingHorizontal: 6 },
  summary: { flexShrink: 1, fontSize: 17, fontWeight: '800' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 8, paddingTop: 4, paddingBottom: 6 },
  section: { flexShrink: 1, fontSize: 11.5, fontWeight: '800', letterSpacing: 0.7 },
  sectionCount: { fontSize: 11.5, fontWeight: '700' },
  item: { marginBottom: 6 },
});
