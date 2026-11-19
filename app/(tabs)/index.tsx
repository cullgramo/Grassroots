import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClubMatches } from '@/components/ClubMatches';
import { EmptyState } from '@/components/EmptyState';
import { FixtureCard } from '@/components/FixtureCard';
import { FixtureMap } from '@/components/FixtureMap';
import { MapControls } from '@/components/MapControls';
import { Sheet, type Snap } from '@/components/Sheet';
import { useTheme } from '@/components/useTheme';
import { useApp } from '@/context/AppContext';
import { searchFixtures, toSections, withinBounds, type Bounds } from '@/utils/filterFixtures';

const PEEK = 76;
const TOP_BAR = 130;

const openFixture = (id: string) => router.push({ pathname: '/fixture/[id]', params: { id } });

export default function ExploreScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { fixtures, upcoming, filters, location, requestLocation, needsSportsChoice, needsCounty, setMyCounty, viewKey, loadState, isStale, refreshing, refresh } =
    useApp();
  const [height, setHeight] = useState(0);
  const [topBar, setTopBar] = useState(TOP_BAR);
  const [snap, setSnap] = useState<Snap>('peek');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [venueIds, setVenueIds] = useState<string[] | null>(null);
  const [recenterKey, setRecenterKey] = useState(0);
  const [fitKey, setFitKey] = useState(0);
  const [placeKey, setPlaceKey] = useState(0);
  const [query, setQuery] = useState('');
  const searching = query.trim().length > 0;

  // Someone who arrives from a shared fixture link asked for "more games near you", so they go straight to the map
  // with every sport showing. The sports question waits until the next time they open the app on its own.
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const fromShare = ref === 'share';
  useEffect(() => {
    if (needsSportsChoice && !fromShare) router.push('/sports');
  }, [needsSportsChoice, fromShare]);


  // While searching, the map and the list both show every match, wherever the map is pointing.
  // A search looks through every upcoming fixture in Ireland, not only the current view: someone typing a club's name
  // wants that club, wherever and whenever it plays.
  // The search itself runs a beat behind the typing, so each keystroke shows at once even with thousands of fixtures.
  const slowQuery = useDeferredValue(query);
  const shown = useMemo(() => (slowQuery.trim() ? searchFixtures(upcoming, slowQuery) : fixtures), [fixtures, upcoming, slowQuery]);
  // The map follows the search once the matches are worked out: it fits them, and when the search is cleared it goes
  // back to the place being shown. (Fitting on each keystroke would fit the matches of the letter before.)
  const [fittedQuery, setFittedQuery] = useState(slowQuery);
  if (fittedQuery !== slowQuery) {
    setFittedQuery(slowQuery);
    if (slowQuery.trim()) setFitKey((k) => k + 1);
    else setPlaceKey((k) => k + 1);
  }
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
  // "Show all": out of a search, or back from wherever the map was dragged, to the place being shown.
  const showAll = useCallback(() => {
    if (query.trim()) setQuery('');
    else setPlaceKey((k) => k + 1);
    setSnap('peek');
  }, [query]);
  const onChangeQuery = useCallback((q: string) => {
    setQuery(q);
    setPickedId(null);
    setVenueIds(null);
    // Typing narrows the map to the matches; the map fits them once they are worked out.
    setSnap('peek');
  }, []);

  const locate = async () => {
    if (!location) await requestLocation();
    setRecenterKey((k) => k + 1);
  };

  // What the map must keep clear: the controls at the top, and the list at the bottom. With the list fully up there
  // is no map left to fit, so the half-open figure is kept and nothing moves behind it.
  const inset = useMemo(
    () => ({ top: topBar, bottom: snap === 'peek' ? PEEK : Math.round(height * 0.5) }),
    [topBar, snap, height]
  );
  // With one day chosen the pins need only say the time. A search runs across every date, so it keeps the day.
  const oneDay = (filters.when === 'today' || filters.when === 'day') && !searching;

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
        // The app changing the place (All Ireland, a chosen county, a widened view) re-fits the map too.
        fitKey={fitKey + viewKey}
        placeKey={placeKey}
        attributionBottom={inset.bottom + 2}
        inset={inset}
        timeOnly={oneDay}
      />

      <View
        style={[styles.top, { paddingTop: insets.top + 8 }]}
        pointerEvents="box-none"
        onLayout={(e) => setTopBar(e.nativeEvent.layout.height)}>
        <MapControls query={query} onChangeQuery={onChangeQuery} elevated />
      </View>

      {needsCounty && snap === 'peek' ? (
        <View style={[styles.countyCard, { backgroundColor: t.card, top: topBar + 12 }]}>
          <Text style={[styles.countyTitle, { color: t.text }]}>Location is off</Text>
          <Text style={[styles.countyText, { color: t.muted }]}>Pick your county to see what is on near you.</Text>
          <View style={styles.countyButtons}>
            <Pressable onPress={() => router.push('/county')} accessibilityRole="button" style={[styles.countyButton, { backgroundColor: t.tint }]}>
              <Text style={[styles.countyButtonText, { color: t.onTint }]}>Choose county</Text>
            </Pressable>
            <Pressable onPress={() => setMyCounty(null)} accessibilityRole="button" style={styles.countyButton}>
              <Text style={[styles.countyButtonText, { color: t.text }]}>Show all Ireland</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {snap === 'peek' ? (
        <View style={[styles.floating, { bottom: PEEK + 28 }]} pointerEvents="box-none">
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
        summary={isStale && loadState === 'ready' ? `${title}. Offline, showing the last saved copy` : title}
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
            contentContainerStyle={[styles.list, { paddingBottom: hidden + 24 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListHeaderComponent={searching ? <ClubMatches query={query} /> : undefined}
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
  locate: {
    alignSelf: 'flex-end',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  emptyCard: { borderRadius: 18, ...shadow },
  countyCard: { position: 'absolute', left: 16, right: 16, borderRadius: 18, padding: 16, ...shadow },
  countyTitle: { fontSize: 17, fontWeight: '800' },
  countyText: { fontSize: 14, marginTop: 4 },
  countyButtons: { flexDirection: 'row', gap: 10, marginTop: 12 },
  countyButton: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  countyButtonText: { fontSize: 15, fontWeight: '800' },
  sheetHeader: { alignItems: 'center', paddingTop: 10, paddingBottom: 14 },
  sheetTitle: { fontSize: 16, fontWeight: '800' },
  sheetHint: { fontSize: 12, marginTop: 2 },
  list: { paddingHorizontal: 16 },
  section: { fontSize: 20, fontWeight: '800', marginTop: 8, marginBottom: 10 },
  item: { marginBottom: 12 },
});
