import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { SPORT_COLORS } from '@/constants/sports';
import { IRELAND, type FixtureMapProps } from './FixtureMap.types';

function pinIcon(color: string, selected: boolean) {
  const size = selected ? 34 : 22;
  const border = selected ? 4 : 3;
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;box-sizing:border-box;background:${color};border:${border}px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>`,
  });
}

// Web stand-in for the native map, so the app can be previewed in a browser.
export function FixtureMap({
  fixtures,
  selectedId,
  onSelect,
  userLocation,
  recenterKey,
  interactive = true,
  style,
}: FixtureMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const userLayer = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  useEffect(() => {
    if (!el.current) return;
    const single = fixtures.length === 1 ? fixtures[0] : null;
    const m = L.map(el.current, {
      zoomControl: false,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      keyboard: interactive,
    }).setView(
      single ? [single.latitude, single.longitude] : [IRELAND.latitude, IRELAND.longitude],
      single ? 14 : 7
    );
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(m);
    markers.current = L.layerGroup().addTo(m);
    userLayer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const group = markers.current;
    if (!group) return;
    group.clearLayers();
    fixtures.forEach((f) => {
      const isSelected = f.id === selectedId;
      L.marker([f.latitude, f.longitude], {
        icon: pinIcon(SPORT_COLORS[f.sport], isSelected),
        zIndexOffset: isSelected ? 1000 : 0,
        title: `${f.homeTeam} v ${f.awayTeam}`,
        interactive: !!onSelectRef.current,
      })
        .on('click', () => onSelectRef.current?.(f.id))
        .addTo(group);
    });
  }, [fixtures, selectedId]);

  useEffect(() => {
    const selected = fixtures.find((f) => f.id === selectedId);
    if (selected && fixtures.length > 1) map.current?.panTo([selected.latitude, selected.longitude]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    const group = userLayer.current;
    if (!group) return;
    group.clearLayers();
    if (userLocation) {
      L.circleMarker([userLocation.latitude, userLocation.longitude], {
        radius: 8,
        color: '#fff',
        weight: 3,
        fillColor: '#3b82f6',
        fillOpacity: 1,
      }).addTo(group);
    }
  }, [userLocation]);

  useEffect(() => {
    if (recenterKey && userLocation) map.current?.setView([userLocation.latitude, userLocation.longitude], 10);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterKey]);

  return (
    <View style={[StyleSheet.absoluteFill, style]}>
      <div ref={el} style={{ width: '100%', height: '100%', zIndex: 0 }} />
    </View>
  );
}
