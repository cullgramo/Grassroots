import { router } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { FixtureCard } from '@/components/FixtureCard';
import { useTheme } from '@/components/useTheme';
import { useApp } from '@/context/AppContext';
import { fixtures as allFixtures } from '@/data/fixtures';

export default function SavedScreen() {
  const t = useTheme();
  const { savedIds } = useApp();
  const saved = allFixtures
    .filter((f) => savedIds.includes(f.id))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return (
    <FlatList
      style={{ backgroundColor: t.background }}
      contentContainerStyle={styles.list}
      data={saved}
      keyExtractor={(f) => f.id}
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
          <Text style={styles.emptyHeart}>{'♡'}</Text>
          <Text style={[styles.emptyTitle, { color: t.text }]}>No saved fixtures yet</Text>
          <Text style={[styles.emptyText, { color: t.muted }]}>
            Tap the heart on any fixture to keep it here.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, flexGrow: 1 },
  item: { marginBottom: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 6 },
  emptyHeart: { fontSize: 56, color: '#e11d48' },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
