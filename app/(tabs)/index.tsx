import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
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
import { toSections, withinBounds, type Bounds } from '@/utils/filterFixtures';

const PEEK = 76;

const openFixture = (id: string) => router.push({ pathname: '/fixture/[id]', params: { id } });

export default function ExploreScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { fixtures, filters, location, requestLocation } = useApp();
  const [height, setHeight] = useState(0);
  const [topBar, setTopBar] = useState(140);
  const [snap, setSnap] = useState<Snap>('peek');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [venueIds, setVenueIds] = useState<string[] | null>(null);
  const [recenterKey, setRecenterKey] = useState(0);
  const [fitKey, setFitKey] = useState(0);

  const selected = fixtures.find((f) => f.id === pickedId) ?? null;

  const visible = useMemo(() => {
    if (venueIds) return fixtures.filter((f) => venueIds.includes(f.id));
    return bounds ? fixtures.filter((f) => withinBounds(f, bounds)) : fixtures;
  }, [fixtures, bounds, venueIds]);
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
    setSnap('peek');
    setFitKey((k) => k + 1);
  }, []);

  const locate = async () => {
    if (!location) await requestLocation();
    setRecenterKey((k) => k + 1);
  };

  const count = visible.length;
  const title = venueIds
    ? `${count} games at ${visible[0]?.venue ?? 'this venue'}`
    : count === 0
      ? 'No games in this area'
      : `${count} ${count === 1 ? 'game' : 'games'} in this area`;
  const floating = snap === 'peek' && (selected || count === 0);

  return (
    <View style={styles.screen} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <FixtureMap
        fixtures={fixtures}
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
        <SearchPill />
        <SportChips elevated />
      </View>

      {snap === 'peek' ? (
        <View style={[styles.floating, { bottom: PEEK + 12 }]} pointerEvents="box-none">
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
        header={
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: t.text }]}>{title}</Text>
            <Text style={[styles.sheetHint, { color: t.muted }]}>
              {snap === 'full' ? 'Tap to show the map' : snap === 'half' ? 'Pull up for more' : 'Pull up for the list'}
            </Text>
          </View>
        }>
        {(hidden) => (
          <SectionList
            sections={sections}
            keyExtractor={(f) => f.id}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={[styles.list, { paddingBottom: hidden + 24 }]}
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
  sheetHeader: { alignItems: 'center', paddingTop: 10, paddingBottom: 14 },
  sheetTitle: { fontSize: 16, fontWeight: '800' },
  sheetHint: { fontSize: 12, marginTop: 2 },
  list: { paddingHorizontal: 16 },
  section: { fontSize: 20, fontWeight: '800', marginTop: 8, marginBottom: 10 },
  item: { marginBottom: 12 },
});
