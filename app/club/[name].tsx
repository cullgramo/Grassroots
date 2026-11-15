import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { FixtureCard } from '@/components/FixtureCard';
import { SponsorSlot } from '@/components/SponsorSlot';
import { useTheme } from '@/components/useTheme';
import { useApp } from '@/context/AppContext';
import { clubCounty, clubFixtures } from '@/utils/club';

/** A club's page: every upcoming game, home and away, its sponsor slot, and a free "claim your club" link. */
export default function ClubScreen() {
  const t = useTheme();
  const { name: raw } = useLocalSearchParams<{ name: string }>();
  const name = (raw ?? '').trim();
  const { allFixtures, loadState } = useApp();
  const games = useMemo(() => clubFixtures(allFixtures, name), [allFixtures, name]);
  const county = useMemo(() => clubCounty(games, name), [games, name]);

  const header = (
    <View style={styles.header}>
      <Text style={[styles.title, { color: t.text }]}>{name}</Text>
      <Text style={[styles.sub, { color: t.muted }]}>
        {[county, games.length === 1 ? '1 upcoming game' : `${games.length} upcoming games`].filter(Boolean).join(' · ')}
      </Text>
      <SponsorSlot clubs={[name]} county={county ?? undefined} />
      <Pressable
        onPress={() => router.push({ pathname: '/claim', params: { club: name, county: county ?? '' } })}
        accessibilityRole="button"
        style={[styles.claim, { borderColor: t.tint }]}>
        <Text style={[styles.claimTitle, { color: t.tint }]}>Is this your club? Claim it free</Text>
        <Text style={[styles.claimText, { color: t.muted }]}>Confirm your fixtures and get a free weekly “games this weekend” graphic.</Text>
      </Pressable>
      <Text style={[styles.section, { color: t.text }]}>Upcoming games</Text>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      <Stack.Screen options={{ title: 'Club' }} />
      <FlatList
        data={games}
        keyExtractor={(f) => f.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <Text style={[styles.sub, { color: t.muted }]}>
            {loadState === 'loading' ? 'Loading…' : 'No upcoming games listed for this club yet.'}
          </Text>
        }
        renderItem={({ item }) => (
          <FixtureCard fixture={item} onPress={() => router.push({ pathname: '/fixture/[id]', params: { id: item.id } })} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  header: { marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800' },
  sub: { fontSize: 15, marginTop: 4 },
  claim: { borderWidth: 1.5, borderRadius: 14, padding: 14, marginTop: 16 },
  claimTitle: { fontSize: 16, fontWeight: '800' },
  claimText: { fontSize: 13, marginTop: 4 },
  section: { fontSize: 18, fontWeight: '800', marginTop: 24 },
});
