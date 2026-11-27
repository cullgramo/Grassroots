import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { FixtureRow } from '@/components/FixtureRow';
import { useTheme } from '@/components/useTheme';
import { useApp } from '@/context/AppContext';
import { COUNTIES } from '@/data/counties';
import { SITE_URL } from '@/lib/config';
import { countyFromSlug, countyMeta, countySlug, toMetadata } from '@/utils/seo';

/** Built as its own web page for each county at publish time, so Google can read every one: /county/offaly. */
export function generateStaticParams(): { name: string }[] {
  return COUNTIES.map((c) => ({ name: countySlug(c) }));
}

/** The page's title and description, written into its HTML when the website is built. */
export function generateMetadata(_request: unknown, params: { name?: string | string[] }) {
  const county = countyFromSlug(Array.isArray(params?.name) ? params.name[0] : params?.name);
  return county ? toMetadata(countyMeta(county), SITE_URL) : null;
}

/** A county's page: every upcoming game there, every sport, soonest first. Mainly a way in from Google. */
export default function CountyPage() {
  const t = useTheme();
  const { name } = useLocalSearchParams<{ name: string }>();
  const county = countyFromSlug(name);
  const { upcoming, loadState, choosePlace, refresh } = useApp();
  const games = useMemo(() => (county ? upcoming.filter((f) => f.county === county) : []), [upcoming, county]);

  if (!county) {
    return (
      <View style={[styles.screen, styles.content, { backgroundColor: t.background }]}>
        <Stack.Screen options={{ title: 'County' }} />
        <Text style={[styles.sub, { color: t.text }]}>There is no county called “{name}”.</Text>
      </View>
    );
  }

  const openMap = () => {
    choosePlace({ county, distanceKm: null });
    router.replace('/');
  };

  const header = (
    <View style={styles.header}>
      <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
        {county}
      </Text>
      <Text style={[styles.sub, { color: t.muted }]}>
        {loadState !== 'ready' ? 'Every sport, every level' : `${games.length === 1 ? '1 upcoming game' : `${games.length} upcoming games`} · every sport, every level`}
      </Text>
      <Pressable onPress={openMap} accessibilityRole="button" style={[styles.map, { backgroundColor: t.tint }]}>
        <Text style={[styles.mapText, { color: t.onTint }]}>See {county} on the map</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      <Stack.Screen options={{ title: county }} />
      <FlatList
        data={games}
        keyExtractor={(f) => f.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        ListEmptyComponent={
          loadState === 'error' ? (
            // The games could not be fetched, so say so rather than suggesting there are none.
            <Pressable onPress={refresh} accessibilityRole="button">
              <Text style={[styles.sub, { color: t.text }]}>Couldn’t load the games. Check your connection, then tap to try again.</Text>
            </Pressable>
          ) : (
            <Text style={[styles.sub, { color: t.muted }]}>
              {loadState === 'loading' ? 'Loading…' : `No upcoming games listed in ${county} yet.`}
            </Text>
          )
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
  map: { borderRadius: 24, paddingVertical: 12, paddingHorizontal: 18, marginTop: 16, alignSelf: 'flex-start' },
  mapText: { fontSize: 16, fontWeight: '800' },
});
