import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { FixtureCard } from '@/components/FixtureCard';
import { SportChips } from '@/components/SportChips';
import { useTheme } from '@/components/useTheme';
import { useApp } from '@/context/AppContext';
import type { Fixture } from '@/types/fixture';
import { getDaysUntil, weekendRange } from '@/utils/date';

function toSections(fixtures: Fixture[]) {
  const [weekendStart, weekendEnd] = weekendRange();
  const today: Fixture[] = [];
  const weekend: Fixture[] = [];
  const later: Fixture[] = [];
  for (const f of fixtures) {
    const t = new Date(f.startsAt);
    if (getDaysUntil(f.startsAt) === 0) today.push(f);
    else if (t >= weekendStart && t < weekendEnd) weekend.push(f);
    else later.push(f);
  }
  return [
    { title: 'Today', data: today },
    { title: 'This weekend', data: weekend },
    { title: 'Coming up', data: later },
  ].filter((s) => s.data.length > 0);
}

export default function FixturesScreen() {
  const t = useTheme();
  const { fixtures, resetFilters } = useApp();
  const sections = useMemo(() => toSections(fixtures), [fixtures]);

  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      <View>
        <SportChips />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(f) => f.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.header, { color: t.text }]}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <FixtureCard
              fixture={item}
              onPress={() => router.push({ pathname: '/fixture/[id]', params: { id: item.id } })}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: t.text }]}>No games match these filters</Text>
            <Pressable onPress={resetFilters} accessibilityRole="button" style={styles.emptyButton}>
              <Text style={[styles.emptyAction, { color: t.tint }]}>Clear filters</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  header: { fontSize: 20, fontWeight: '800', marginTop: 12, marginBottom: 10 },
  item: { marginBottom: 12 },
  empty: { alignItems: 'center', paddingTop: 64 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  emptyAction: { fontSize: 15, fontWeight: '700' },
});
