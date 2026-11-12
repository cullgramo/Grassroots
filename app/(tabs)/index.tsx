import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { FixtureCard } from '@/components/FixtureCard';
import { FixtureMap } from '@/components/FixtureMap';
import { SearchPill } from '@/components/SearchPill';
import { Sheet, type Snap } from '@/components/Sheet';
import { SportChips } from '@/components/SportChips';
import { useTheme } from '@/components/useTheme';
import { useApp } from '@/context/AppContext';
import { searchFixtures, toSections, withinBounds, type Bounds } from '@/utils/filterFixtures';

const PEEK = 76;
const TOP_BAR = 140;

const openFixture = (id: string) => router.push({ pathname: '/fixture/[id]', params: { id } });

export default function ExploreScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { fixtures, filters, location, requestLocation, needsSportsChoice, loadState, isStale, refreshing, refresh } =
    useApp();
  const [height, setHeight] = useState(0);
  const [topBar, setTopBar] = useState(TOP_BAR);
  const [snap, setSnap] = useState<Snap>('peek');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [venueIds, setVenueIds] = useState<string[] | null>(null);
  const [recenterKey, setRecenterKey] = useState(0);
  const [fitKey, setFitKey] = useState(0);
  const [query, setQuery] = useState('');
  const searching = query.trim().length > 0;

  useEffect(() => {
    if (needsSportsChoice) router.push('/sports');
  }, [needsSportsChoice]);

  // While searching, the map and the list both show every match, wherever the map is pointing.
  const shown = useMemo(() => searchFixtures(fixtures, query), [fixtures, query]);
  const selected = shown.find((f) => f.id === pickedId) ?? null;

  const visible = useMemo(() => {
    if (venueIds) return shown.filter((f) => venueIds.includes(f.id));
    if (searching) return shown;
    return bounds ? shown.filter((f) => withinBounds(f, bounds)) : shown;
  }, [shown, bounds, venueIds, searching]);
  const sections = useMemo(() => toSections(visible), [visible]);

  const onBoundsChange = useCallback((b: Bounds) => {
    setBounds(b);
    setVenueIds(null);
  }, []);
  const onSelect = useCallback((id: string | null) => {
    setPickedId(id);
    setVenueIds(null);
    setSnap('peek');
  }, []);
  const onVenuePress = useCallback((ids: string[]) => {
    setPickedId(null);
    setVenueIds(ids);
    setSnap('half');
  }, []);
  const showAll = useCallback(() => {
    setQuery('');
    setSnap('peek');
    setFitKey((k) => k + 1);
  }, []);
  const onChangeQuery = useCallback((q: string) => {
    setQuery(q);
    setPickedId(null);
    setVenueIds(null);
    // Typing opens the list of matches and fits the map to them.
    if (q.trim()) setSnap('full');
    setFitKey((k) => k + 1);
  }, []);

  const locate = async () => {
    if (!location) await requestLocation();
    setRecenterKey((k) => k + 1);
  };

  const count = visible.length;
  const title = loadState === 'loading'
    ? 'Loading fixtures…'
    : loadState === 'error'
      ? "Couldn't load fixtures"
      : venueIds
    ? `${count} fixtures at ${visible[0]?.venue ?? 'this venue'}`
    : searching
      ? `${count} ${count === 1 ? 'result' : 'results'} for “${query.trim()}”`
    : count === 0
      ? 'No fixtures in this area'
      : `${count} ${count === 1 ? 'fixture' : 'fixtures'} in this area`;
  const floating = snap === 'peek' && (selected || count === 0);

  return (
    <View style={styles.screen} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <FixtureMap
        fixtures={shown}
        selectedId={selected?.id ?? null}
        onSelect={onSelect}
        onVenuePress={onVenuePress}
        onBoundsChange={onBoundsChange}
        userLocation={location}
        radiusKm={filters.distanceKm}
        fitRadius
        startOnUser
        recenterKey={recenterKey}
        fitKey={fitKey}
      />

      <View
        style={[styles.top, { paddingTop: insets.top + 8 }]}
        pointerEvents="box-none"
        onLayout={(e) => setTopBar(e.nativeEvent.layout.height)}>
        <SearchPill query={query} onChangeQuery={onChangeQuery} />
        <SportChips elevated />
      </View>

      {snap === 'peek' ? (
        <View style={[styles.floating, { bottom: PEEK + 12 }]} pointerEvents="box-none">
          <View style={styles.buttons} pointerEvents="box-none">
          <Pressable
            onPress={() => setSnap('full')}
            accessibilityRole="button"
            accessibilityLabel="Show fixtures as a list"
            style={[styles.toggle, { backgroundColor: t.text }]}>
            <SymbolView name={{ ios: 'list.bullet', android: 'list', web: 'list' }} tintColor={t.background} size={18} />
            <Text style={[styles.toggleText, { color: t.background }]}>List</Text>
          </Pressable>
          <Pressable
            onPress={locate}
            accessibilityRole="button"
            accessibilityLabel="Centre map on my location"
            style={[styles.locate, { backgroundColor: t.card }]}>
            <SymbolView
              name={{ ios: 'location.fill', android: 'my_location', web: 'my_location' }}
              tintColor={t.tint}
              size={22}
            />
          </Pressable>
          </View>
          {floating ? (
            selected ? (
              <FixtureCard fixture={selected} elevated onPress={() => openFixture(selected.id)} />
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: t.card }]}>
                <EmptyState onShowAll={showAll} />
              </View>
            )
          ) : null}
        </View>
      ) : null}

      <Sheet
        height={height}
        topOffset={topBar + 4}
        peekHeight={PEEK}
        snap={snap}
        onSnap={setSnap}
        header={
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: t.text }]}>{title}</Text>
            <Text style={[styles.sheetHint, { color: t.muted }]}>
              {isStale && loadState === 'ready'
                ? 'Offline: showing the last saved copy'
                : snap === 'full'
                  ? 'Tap to show the map'
                  : snap === 'half'
                    ? 'Pull up for more'
                    : 'Pull up for the list'}
            </Text>
          </View>
        }>
        {(hidden) => (
          <SectionList
            sections={sections}
            keyExtractor={(f) => f.id}
            stickySectionHeadersEnabled={false}
            refreshing={refreshing}
            onRefresh={refresh}
            contentContainerStyle={[styles.list, { paddingBottom: hidden + 96 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            renderSectionHeader={({ section }) => (
              <Text style={[styles.section, { color: t.text }]}>{section.title}</Text>
            )}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <FixtureCard fixture={item} onPress={() => openFixture(item.id)} />
              </View>
            )}
            ListEmptyComponent={<EmptyState onShowAll={showAll} />}
          />
        )}
      </Sheet>

      {snap !== 'peek' ? (
        <View style={[styles.mapButton, { bottom: insets.bottom + 16 }]} pointerEvents="box-none">
          <Pressable
            onPress={() => setSnap('peek')}
            accessibilityRole="button"
            accessibilityLabel="Show fixtures on the map"
            style={[styles.toggle, { backgroundColor: t.text }]}>
            <SymbolView name={{ ios: 'map.fill', android: 'map', web: 'map' }} tintColor={t.background} size={18} />
            <Text style={[styles.toggleText, { color: t.background }]}>Map</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 5,
};

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden' },
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
  floating: { position: 'absolute', left: 16, right: 16, gap: 12 },
  buttons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    minHeight: 48,
    borderRadius: 24,
    ...shadow,
  },
  toggleText: { fontSize: 15, fontWeight: '800' },
  mapButton: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  locate: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  emptyCard: { borderRadius: 18, ...shadow },
  sheetHeader: { alignItems: 'center', paddingTop: 10, paddingBottom: 14 },
  sheetTitle: { fontSize: 16, fontWeight: '800' },
  sheetHint: { fontSize: 12, marginTop: 2 },
  list: { paddingHorizontal: 16 },
  section: { fontSize: 20, fontWeight: '800', marginTop: 8, marginBottom: 10 },
  item: { marginBottom: 12 },
});
