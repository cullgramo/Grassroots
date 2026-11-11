import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FixtureCard } from '@/components/FixtureCard';
import { FixtureMap } from '@/components/FixtureMap';
import { SportChips } from '@/components/SportChips';
import { useTheme } from '@/components/useTheme';
import { useApp } from '@/context/AppContext';
import type { Fixture } from '@/types/fixture';

const GAP = 12;
const SIDE = 16;

export default function MapScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { fixtures, location, requestLocation, resetFilters } = useApp();
  const [pickedId, setSelectedId] = useState<string | null>(null);
  const selectedId = fixtures.some((f) => f.id === pickedId) ? pickedId : (fixtures[0]?.id ?? null);
  const [recenterKey, setRecenterKey] = useState(0);
  const list = useRef<FlatList<Fixture>>(null);
  const ignoreScrollUntil = useRef(0);
  const cardWidth = Math.min(width - SIDE * 2 - 24, 420);

  const selectFromMap = useCallback(
    (id: string) => {
      const index = fixtures.findIndex((f) => f.id === id);
      if (index < 0) return;
      // The scroll below passes over other cards; do not let them steal the selection.
      ignoreScrollUntil.current = Date.now() + 700;
      setSelectedId(id);
      list.current?.scrollToOffset({ offset: index * (cardWidth + GAP), animated: true });
    },
    [fixtures, cardWidth]
  );

  const onViewable = useCallback(({ viewableItems }: { viewableItems: { item: Fixture }[] }) => {
    if (Date.now() < ignoreScrollUntil.current) return;
    const first = viewableItems[0]?.item;
    if (first) setSelectedId(first.id);
  }, []);

  const locate = async () => {
    if (!location) await requestLocation();
    setRecenterKey((k) => k + 1);
  };

  return (
    <View style={styles.screen}>
      <FixtureMap
        fixtures={fixtures}
        selectedId={selectedId}
        onSelect={selectFromMap}
        userLocation={location}
        recenterKey={recenterKey}
      />

      <View style={[styles.top, { paddingTop: insets.top + 4 }]} pointerEvents="box-none">
        <SportChips elevated />
      </View>

      <View style={styles.bottom} pointerEvents="box-none">
        <View style={styles.bottomBar} pointerEvents="box-none">
          <View style={[styles.count, { backgroundColor: t.card }]}>
            <Text style={[styles.countText, { color: t.text }]}>
              {fixtures.length} {fixtures.length === 1 ? 'game' : 'games'}
            </Text>
          </View>
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

        {fixtures.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[styles.emptyTitle, { color: t.text }]}>No games match these filters</Text>
            <Pressable onPress={resetFilters} accessibilityRole="button" style={styles.emptyButton}>
              <Text style={[styles.emptyAction, { color: t.tint }]}>Clear filters</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            ref={list}
            data={fixtures}
            keyExtractor={(f) => f.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardWidth + GAP}
            decelerationRate="fast"
            contentContainerStyle={styles.cards}
            getItemLayout={(_, index) => ({ length: cardWidth + GAP, offset: (cardWidth + GAP) * index, index })}
            onViewableItemsChanged={onViewable}
            viewabilityConfig={{ itemVisiblePercentThreshold: 70 }}
            renderItem={({ item }) => (
              <View style={{ width: cardWidth }}>
                <FixtureCard
                  fixture={item}
                  elevated
                  selected={item.id === selectedId}
                  onPress={() => router.push({ pathname: '/fixture/[id]', params: { id: item.id } })}
                />
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.18,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 4,
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: SIDE,
  },
  count: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, ...shadow },
  countText: { fontSize: 13, fontWeight: '700' },
  locate: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', ...shadow },
  cards: { paddingHorizontal: SIDE, paddingTop: 10, paddingBottom: 16, gap: GAP },
  empty: { margin: SIDE, padding: 18, borderRadius: 16, borderWidth: 1, alignItems: 'center', ...shadow },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  emptyAction: { fontSize: 15, fontWeight: '700' },
});
