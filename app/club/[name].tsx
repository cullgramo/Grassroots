import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { FollowButton, groupLabel } from '@/components/ClubRow';
import { FixtureRow } from '@/components/FixtureRow';
import { SponsorSlot } from '@/components/SponsorSlot';
import { useTheme } from '@/components/useTheme';
import { useApp } from '@/context/AppContext';
import { clubCounty, clubFixtures, clubGroup, clubId, clubName } from '@/utils/club';

/** A club's page: every upcoming game, home and away, its sponsor slot, and a free "claim your club" link. */
export default function ClubScreen() {
  const t = useTheme();
  const { name: raw, sport } = useLocalSearchParams<{ name: string; sport?: string }>();
  // The page is for the club, not one of its teams: "Naas U14" opens Naas, with every Naas team's games.
  const name = clubName((raw ?? '').trim());
  const { upcoming, loadState } = useApp();
  // Without a sport in the link, the club's sport is taken from its games when they are all one family.
  const group = useMemo(() => {
    if (sport) return sport;
    const groups = new Set(clubFixtures(upcoming, name).map(clubGroup));
    return groups.size === 1 ? [...groups][0] : undefined;
  }, [sport, upcoming, name]);
  const games = useMemo(() => clubFixtures(upcoming, name, group), [upcoming, name, group]);
  const county = useMemo(() => clubCounty(games, name), [games, name]);

  const header = (
    <View style={styles.header}>
      <Text style={[styles.title, { color: t.text }]}>{name}</Text>
      <Text style={[styles.sub, { color: t.muted }]}>
        {[group ? groupLabel(group) : null, county, games.length === 1 ? '1 upcoming game' : `${games.length} upcoming games`].filter(Boolean).join(' · ')}
      </Text>
      {group && name ? <FollowButton large club={{ id: clubId(name, group), name, group }} /> : null}
      {group && name ? <Text style={[styles.followNote, { color: t.muted }]}>Followed clubs are kept on this phone, under Favourites.</Text> : null}
      <SponsorSlot clubs={[name]} county={county ?? undefined} />
      <Pressable
        onPress={() => router.push({ pathname: '/claim', params: { club: name, county: county ?? '' } })}
        accessibilityRole="button"
        style={[styles.claim, { borderColor: t.tint }]}>
        <Text style={[styles.claimTitle, { color: t.tint }]}>Is this your club? Claim it free</Text>
        <Text style={[styles.claimText, { color: t.muted }]}>Tell us you run this club, so we can check its fixtures with you.</Text>
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
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        ListEmptyComponent={
          <Text style={[styles.sub, { color: t.muted }]}>
            {loadState === 'loading' ? 'Loading…' : 'No upcoming games listed for this club yet.'}
          </Text>
        }
        renderItem={({ item }) => (
          <FixtureRow fixture={item} showDay onPress={() => router.push({ pathname: '/fixture/[id]', params: { id: item.id } })} />
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
  followNote: { fontSize: 13, marginTop: 8 },
  claim: { borderWidth: 1.5, borderRadius: 14, padding: 14, marginTop: 16 },
  claimTitle: { fontSize: 16, fontWeight: '800' },
  claimText: { fontSize: 13, marginTop: 4 },
  section: { fontSize: 18, fontWeight: '800', marginTop: 24 },
});
