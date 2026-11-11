import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { SPORT_COLORS } from '@/constants/sports';
import { IRELAND, type FixtureMapProps } from './FixtureMap.types';

export function FixtureMap({
  fixtures,
  selectedId,
  onSelect,
  userLocation,
  recenterKey,
  interactive = true,
  style,
}: FixtureMapProps) {
  const map = useRef<MapView>(null);
  const selected = fixtures.find((f) => f.id === selectedId);
  const single = fixtures.length === 1 ? fixtures[0] : null;

  useEffect(() => {
    if (!selected) return;
    map.current?.animateCamera({ center: { latitude: selected.latitude, longitude: selected.longitude } }, { duration: 350 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  useEffect(() => {
    if (!recenterKey || !userLocation) return;
    map.current?.animateToRegion({ ...userLocation, latitudeDelta: 0.6, longitudeDelta: 0.6 }, 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterKey]);

  return (
    <MapView
      ref={map}
      style={[StyleSheet.absoluteFill, style]}
      initialRegion={
        single
          ? { latitude: single.latitude, longitude: single.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
          : { ...IRELAND, latitudeDelta: 5.2, longitudeDelta: 5.2 }
      }
      showsUserLocation={!!userLocation}
      showsMyLocationButton={false}
      toolbarEnabled={false}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      rotateEnabled={false}
      pitchEnabled={false}>
      {fixtures.map((f) => {
        const isSelected = f.id === selectedId;
        return (
          <Marker
            key={f.id}
            coordinate={{ latitude: f.latitude, longitude: f.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={isSelected ? 2 : 1}
            onPress={() => onSelect?.(f.id)}>
            <View
              style={[
                styles.pin,
                { backgroundColor: SPORT_COLORS[f.sport] },
                isSelected && styles.pinSelected,
              ]}
            />
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  pin: { width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: '#fff' },
  pinSelected: { width: 34, height: 34, borderRadius: 17, borderWidth: 4 },
});
