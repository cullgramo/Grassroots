import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker, type Region } from 'react-native-maps';

import { getSport } from '@/constants/sports';
import { buildClusterIndex, getMapItems, MAX_SPLIT_ZOOM } from '@/utils/cluster';
import { pinLabelFor } from '@/utils/date';
import type { Bounds } from '@/utils/filterFixtures';
import { IRELAND, PIN_DARK, type FixtureMapProps } from './FixtureMap.types';

const COUNTRY: Region = { ...IRELAND, latitudeDelta: 5.2, longitudeDelta: 5.2 };

function toBounds(r: Region): Bounds {
  return {
    north: r.latitude + r.latitudeDelta / 2,
    south: r.latitude - r.latitudeDelta / 2,
    east: r.longitude + r.longitudeDelta / 2,
    west: r.longitude - r.longitudeDelta / 2,
  };
}

const toZoom = (r: Region) => Math.log2(360 / r.longitudeDelta);

type Inset = { top: number; bottom: number };

/** The ground people can actually see: the region without the strips hidden under the controls and the list. */
function visibleBounds(r: Region, inset: Inset, height: number): Bounds {
  const b = toBounds(r);
  if (height <= 0 || height - inset.top - inset.bottom < 80) return b;
  return { ...b, north: b.north - r.latitudeDelta * (inset.top / height), south: b.south + r.latitudeDelta * (inset.bottom / height) };
}

export function FixtureMap({
  fixtures,
  selectedId,
  onSelect,
  onVenuePress,
  onBoundsChange,
  userLocation,
  radiusKm,
  fitRadius,
  startOnUser,
  recenterKey,
  fitKey,
  placeKey,
  interactive = true,
  inset,
  timeOnly = false,
  style,
}: FixtureMapProps) {
  const map = useRef<MapView>(null);
  const [height, setHeight] = useState(0);
  const insetRef = useRef<Inset>({ top: inset?.top ?? 0, bottom: inset?.bottom ?? 0 });
  // The last move the app itself made. It is made again when the list covers more or less of the map; once the user
  // moves the map by hand it is forgotten, because their view wins.
  const lastFit = useRef<(() => void) | null>(null);
  // One change can ask for two fits at once (choosing a county turns the search circle off, which asks for the whole
  // island, and also asks for that county's fixtures). Only the last one asked is made.
  const waiting = useRef<(() => void) | null>(null);
  const fit = (move: () => void) => {
    lastFit.current = move;
    const first = waiting.current === null;
    waiting.current = move;
    if (!first) return;
    requestAnimationFrame(() => {
      const latest = waiting.current;
      waiting.current = null;
      latest?.();
    });
  };
  // Padding that keeps a fitted area inside the visible part of the map, with a little air around it.
  const edge = (side: number, air: number) => ({ top: insetRef.current.top + air, bottom: insetRef.current.bottom + air, left: side, right: side });
  // The four outermost points of the search circle; the padding keeps all of it clear of the controls and the list.
  const fitCircle = (latitude: number, longitude: number, km: number) => {
    const dLat = km / 111;
    const dLon = dLat / Math.cos((latitude * Math.PI) / 180);
    fit(() =>
      map.current?.fitToCoordinates(
        [
          { latitude: latitude + dLat, longitude },
          { latitude: latitude - dLat, longitude },
          { latitude, longitude: longitude + dLon },
          { latitude, longitude: longitude - dLon },
        ],
        { edgePadding: edge(14, 14), animated: true }
      )
    );
  };
  const fitFixtures = () => {
    const points = fixtures.map((f) => ({ latitude: f.latitude, longitude: f.longitude }));
    // One ground on its own would be shown at street-corner scale; give it some room either side.
    const lats = points.map((c) => c.latitude);
    const lons = points.map((c) => c.longitude);
    if (Math.max(...lats) - Math.min(...lats) < 0.02 && Math.max(...lons) - Math.min(...lons) < 0.02) {
      points.push({ latitude: lats[0] + 0.02, longitude: lons[0] + 0.03 }, { latitude: lats[0] - 0.02, longitude: lons[0] - 0.03 });
    }
    fit(() => map.current?.fitToCoordinates(points, { edgePadding: edge(60, 34), animated: true }));
  };
  const single = fixtures.length === 1 ? fixtures[0] : null;
  const initial: Region = single
    ? { latitude: single.latitude, longitude: single.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : COUNTRY;
  const [region, setRegion] = useState(initial);
  const startedOnUser = useRef(false);
  const hadRadius = useRef(false);

  const index = useMemo(() => buildClusterIndex(fixtures), [fixtures]);
  const items = useMemo(
    () => getMapItems(index, fixtures, toBounds(region), toZoom(region)),
    [index, fixtures, region]
  );
  const selected = fixtures.find((f) => f.id === selectedId);

  useEffect(() => {
    if (!selected || single) return;
    lastFit.current = null;
    // The chosen pin goes to the middle of what can be seen, not the middle of the whole map, so it is never behind the list.
    const shift = height > 0 ? (region.latitudeDelta * (insetRef.current.bottom - insetRef.current.top)) / 2 / height : 0;
    map.current?.animateCamera({ center: { latitude: selected.latitude - shift, longitude: selected.longitude } }, { duration: 350 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // The list was pulled up or let down, or the controls grew: make the app's last fit again for the new visible part.
  useEffect(() => {
    const next = { top: inset?.top ?? 0, bottom: inset?.bottom ?? 0 };
    const prev = insetRef.current;
    if (prev.top === next.top && prev.bottom === next.bottom) return;
    insetRef.current = next;
    lastFit.current?.();
    onBoundsChange?.(visibleBounds(region, next, height));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inset?.top, inset?.bottom]);

  useEffect(() => {
    if (!userLocation) return;
    if (recenterKey || (startOnUser && !startedOnUser.current)) {
      startedOnUser.current = true;
      const { latitude, longitude } = userLocation;
      fit(() =>
        map.current?.fitToCoordinates(
          [{ latitude: latitude + 0.45, longitude }, { latitude: latitude - 0.45, longitude }],
          { edgePadding: edge(0, 0), animated: true }
        )
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterKey, userLocation]);

  useEffect(() => {
    if (!fitRadius) return;
    if (!userLocation || !radiusKm) {
      if (hadRadius.current) {
        fit(() =>
          map.current?.fitToCoordinates(
            [{ latitude: 51.3, longitude: -10.7 }, { latitude: 55.4, longitude: -5.4 }],
            { edgePadding: edge(10, 10), animated: true }
          )
        );
      }
      hadRadius.current = false;
      return;
    }
    hadRadius.current = true;
    fitCircle(userLocation.latitude, userLocation.longitude, radiusKm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitRadius, radiusKm, userLocation]);

  useEffect(() => {
    if (!fitKey || fixtures.length === 0) return;
    fitFixtures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  // Back to the place being shown: the search circle when there is one, otherwise every fixture.
  useEffect(() => {
    if (!placeKey) return;
    if (fitRadius && userLocation && radiusKm) fitCircle(userLocation.latitude, userLocation.longitude, radiusKm);
    else if (fixtures.length > 0) fitFixtures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeKey]);

  return (
    <MapView
      ref={map}
      style={[StyleSheet.absoluteFill, style]}
      initialRegion={initial}
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      onRegionChangeComplete={(r, details) => {
        // A move made by hand replaces whatever the app last fitted.
        if (details?.isGesture) lastFit.current = null;
        setRegion(r);
        // Pins are drawn for the whole map; the list is told only about the part people can see.
        onBoundsChange?.(visibleBounds(r, insetRef.current, height));
      }}
      onPress={(e) => {
        if (e.nativeEvent.action !== 'marker-press') onSelect?.(null);
      }}
      showsUserLocation={!!userLocation}
      showsMyLocationButton={false}
      toolbarEnabled={false}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      rotateEnabled={false}
      pitchEnabled={false}>
      {userLocation && radiusKm ? (
        <Circle
          center={userLocation}
          radius={radiusKm * 1000}
          strokeColor="rgba(5,150,105,0.9)"
          fillColor="rgba(5,150,105,0.10)"
          strokeWidth={2}
        />
      ) : null}

      {items.map((item) => {
        if (item.type === 'cluster') {
          return (
            <Marker
              key={item.key}
              coordinate={{ latitude: item.latitude, longitude: item.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => {
                if (item.expansionZoom > MAX_SPLIT_ZOOM) {
                  onVenuePress?.(item.fixtureIds);
                  return;
                }
                lastFit.current = null;
                const delta = 360 / Math.pow(2, item.expansionZoom + 0.5);
                map.current?.animateToRegion(
                  { latitude: item.latitude, longitude: item.longitude, latitudeDelta: delta, longitudeDelta: delta },
                  350
                );
              }}>
              <View style={styles.cluster}>
                <Text style={styles.clusterText} allowFontScaling={false}>{item.count}</Text>
              </View>
            </Marker>
          );
        }
        const f = item.fixture;
        const isSelected = f.id === selectedId;
        return (
          <Marker
            key={f.id}
            coordinate={{ latitude: f.latitude, longitude: f.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={isSelected ? 2 : 1}
            onPress={() => onSelect?.(f.id)}>
            <View style={[styles.pill, isSelected && styles.pillSelected]}>
              <View style={[styles.dot, { backgroundColor: getSport(f.sport).color }]} />
              <Text style={[styles.pillText, isSelected && styles.pillTextSelected]} allowFontScaling={false}>{pinLabelFor(f, undefined, timeOnly)}</Text>
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}

const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.25,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
  elevation: 4,
};

// The bubbles are kept small, and keep their size whatever text size the phone is set to: big bubbles hide the map.
const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 13,
    paddingHorizontal: 8,
    paddingVertical: 4,
    ...shadow,
  },
  pillSelected: { backgroundColor: PIN_DARK },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  pillText: { fontSize: 12, fontWeight: '800', color: PIN_DARK },
  pillTextSelected: { color: '#fff' },
  cluster: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PIN_DARK,
    borderWidth: 2,
    borderColor: '#fff',
    ...shadow,
  },
  clusterText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
