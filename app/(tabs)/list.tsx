import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { FixtureCard } from '@/components/FixtureCard';
import { SearchPill } from '@/components/SearchPill';
import { SportChips } from '@/components/SportChips';
import { useTheme } from '@/components/useTheme';
import { useApp } from '@/context/AppContext';
import { searchFixtures, toSections } from '@/utils/filterFixtures';

/** Every fixture as a plain list, soonest first, with its own search bar. */
export default function ListScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { fixtures, loadState, isStale, refreshing, refresh } = useApp();
  const [query, setQuery] = useState('');

  const shown = useMemo(() => searchFixtures(fixtures, query), [fixtures, query]);
  const sections = useMemo(() => toSections(shown), [shown]);
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
      <SearchPill query={query} onChangeQuery={setQuery} />
      <SportChips elevated />
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
          <Text style={[styles.summary, { color: t.muted }]}>
            {isStale && loadState === 'ready' ? `${summary} · offline, last saved copy` : summary}
          </Text>
        }
        renderSectionHeader={({ section }) => <Text style={[styles.section, { color: t.text }]}>{section.title}</Text>}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <FixtureCard
              fixture={item}
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
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  summary: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  section: { fontSize: 20, fontWeight: '800', marginTop: 8, marginBottom: 10 },
  item: { marginBottom: 12 },
});
