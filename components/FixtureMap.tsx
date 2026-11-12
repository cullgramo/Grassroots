import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker, type Region } from 'react-native-maps';

import { getSport } from '@/constants/sports';
import { buildClusterIndex, getMapItems, MAX_SPLIT_ZOOM } from '@/utils/cluster';
import { pinLabel } from '@/utils/date';
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
  interactive = true,
  style,
}: FixtureMapProps) {
  const map = useRef<MapView>(null);
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
    map.current?.animateCamera({ center: { latitude: selected.latitude, longitude: selected.longitude } }, { duration: 350 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  useEffect(() => {
    if (!userLocation) return;
    if (recenterKey || (startOnUser && !startedOnUser.current)) {
      startedOnUser.current = true;
      map.current?.animateToRegion({ ...userLocation, latitudeDelta: 0.9, longitudeDelta: 0.9 }, 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterKey, userLocation]);

  useEffect(() => {
    if (!fitRadius) return;
    if (!userLocation || !radiusKm) {
      if (hadRadius.current) map.current?.animateToRegion(COUNTRY, 300);
      hadRadius.current = false;
      return;
    }
    hadRadius.current = true;
    const latitudeDelta = (radiusKm * 2.6) / 111;
    const longitudeDelta = latitudeDelta / Math.cos((userLocation.latitude * Math.PI) / 180);
    map.current?.animateToRegion({ ...userLocation, latitudeDelta, longitudeDelta }, 300);
  }, [fitRadius, radiusKm, userLocation]);

  useEffect(() => {
    if (!fitKey || fixtures.length === 0) return;
    map.current?.fitToCoordinates(
      fixtures.map((f) => ({ latitude: f.latitude, longitude: f.longitude })),
      { edgePadding: { top: 160, right: 60, bottom: 160, left: 60 }, animated: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  return (
    <MapView
      ref={map}
      style={[StyleSheet.absoluteFill, style]}
      initialRegion={initial}
      onRegionChangeComplete={(r) => {
        setRegion(r);
        onBoundsChange?.(toBounds(r));
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
                const delta = 360 / Math.pow(2, item.expansionZoom + 0.5);
                map.current?.animateToRegion(
                  { latitude: item.latitude, longitude: item.longitude, latitudeDelta: delta, longitudeDelta: delta },
                  350
                );
              }}>
              <View style={styles.cluster}>
                <Text style={styles.clusterText}>{item.count}</Text>
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
              <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>{pinLabel(f.startsAt, undefined, f.timeTbc)}</Text>
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

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    ...shadow,
  },
  pillSelected: { backgroundColor: PIN_DARK },
  dot: { width: 9, height: 9, borderRadius: 5, marginRight: 6 },
  pillText: { fontSize: 13, fontWeight: '800', color: PIN_DARK },
  pillTextSelected: { color: '#fff' },
  cluster: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PIN_DARK,
    borderWidth: 3,
    borderColor: '#fff',
    ...shadow,
  },
  clusterText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
