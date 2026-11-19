import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ClubRow } from '@/components/ClubRow';
import { FixtureRow } from '@/components/FixtureRow';
import { useTheme } from '@/components/useTheme';
import { useApp } from '@/context/AppContext';
import { clubFixtures } from '@/utils/club';
import { fixtureTitle } from '@/types/fixture';
import { pinLabel } from '@/utils/date';

/** The clubs someone follows, each with its next game, then the fixtures they saved. All kept on this phone. */
export default function SavedScreen() {
  const t = useTheme();
  const { savedIds, upcoming, followedClubs, loadState } = useApp();
  const saved = useMemo(() => upcoming.filter((f) => savedIds.includes(f.id)), [upcoming, savedIds]);
  const clubs = useMemo(
    () =>
      followedClubs
        .map((club) => ({ club, games: clubFixtures(upcoming, club.name, club.group) }))
        .sort((a, b) => (a.games[0]?.startsAt ?? '9').localeCompare(b.games[0]?.startsAt ?? '9') || a.club.name.localeCompare(b.club.name)),
    [followedClubs, upcoming]
  );
  const loading = loadState === 'loading' && upcoming.length === 0;

  if (clubs.length === 0 && saved.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: t.background }]}>
        <Text style={styles.emptyHeart}>{'♡'}</Text>
        <Text style={[styles.emptyTitle, { color: t.text }]}>{loading ? 'Loading…' : 'Nothing here yet'}</Text>
        {loading ? null : (
          <Text style={[styles.emptyText, { color: t.muted }]}>
            Search for your club and tap Follow to see all its games here. Tap the heart on any fixture to keep it too.
          </Text>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.list}>
      {clubs.length > 0 ? <Text style={[styles.section, { color: t.text }]}>My clubs</Text> : null}
      {clubs.map(({ club, games }) => {
        const next = games[0];
        const detail = loading
          ? 'Loading…'
          : next
            ? `${games.length === 1 ? '1 game' : `${games.length} games`} · next ${pinLabel(next.startsAt, undefined, next.timeTbc)}: ${fixtureTitle(next)}`
            : 'No upcoming games listed';
        return (
          <View key={club.id} style={styles.item}>
            <ClubRow club={club} detail={detail} />
          </View>
        );
      })}
      {saved.length > 0 ? <Text style={[styles.section, clubs.length > 0 && styles.sectionGap, { color: t.text }]}>Saved fixtures</Text> : null}
      {saved.map((item) => (
        <View key={item.id} style={styles.item}>
          <FixtureRow fixture={item} showDay onPress={() => router.push({ pathname: '/fixture/[id]', params: { id: item.id } })} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 48 },
  item: { marginBottom: 12 },
  section: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  sectionGap: { marginTop: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 6 },
  emptyHeart: { fontSize: 56, color: '#e11d48' },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
