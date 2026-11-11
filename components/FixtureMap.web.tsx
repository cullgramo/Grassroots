import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { getSport } from '@/constants/sports';
import { fixtureTitle } from '@/types/fixture';
import { buildClusterIndex, getMapItems, MAX_SPLIT_ZOOM } from '@/utils/cluster';
import { pinLabel } from '@/utils/date';
import type { Bounds } from '@/utils/filterFixtures';
import { IRELAND, PIN_DARK, type FixtureMapProps } from './FixtureMap.types';

const FONT = 'font:800 13px system-ui,-apple-system,sans-serif';
const CENTRED = 'position:absolute;transform:translate(-50%,-50%);box-shadow:0 2px 6px rgba(0,0,0,.35);white-space:nowrap';

function pillIcon(label: string, color: string, selected: boolean) {
  return L.divIcon({
    className: '',
    iconSize: [0, 0],
    html: `<div style="${CENTRED};${FONT};display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:16px;background:${selected ? PIN_DARK : '#fff'};color:${selected ? '#fff' : PIN_DARK}"><span style="width:9px;height:9px;border-radius:50%;background:${color}"></span>${label}</div>`,
  });
}

function clusterIcon(count: number) {
  return L.divIcon({
    className: '',
    iconSize: [0, 0],
    html: `<div style="${CENTRED};font:800 15px system-ui,-apple-system,sans-serif;box-sizing:border-box;min-width:40px;height:40px;padding:0 8px;display:flex;align-items:center;justify-content:center;border-radius:20px;background:${PIN_DARK};color:#fff;border:3px solid #fff">${count}</div>`,
  });
}

function toBounds(m: L.Map): Bounds {
  const b = m.getBounds();
  return { north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() };
}

// Web stand-in for the native map, so the app can be previewed in a browser.
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
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const userLayer = useRef<L.LayerGroup | null>(null);
  const startedOnUser = useRef(false);
  const hadRadius = useRef(false);
  const handlers = useRef({ onSelect, onVenuePress, onBoundsChange });
  useEffect(() => {
    handlers.current = { onSelect, onVenuePress, onBoundsChange };
  });
  const [view, setView] = useState<{ bounds: Bounds; zoom: number } | null>(null);
  const single = fixtures.length === 1 ? fixtures[0] : null;

  useEffect(() => {
    if (!el.current) return;
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
    userLayer.current = L.layerGroup().addTo(m);
    markers.current = L.layerGroup().addTo(m);
    map.current = m;
    const report = () => {
      const bounds = toBounds(m);
      setView({ bounds, zoom: m.getZoom() });
      handlers.current.onBoundsChange?.(bounds);
    };
    m.on('moveend', report);
    m.on('click', () => handlers.current.onSelect?.(null));
    report();
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const index = useMemo(() => buildClusterIndex(fixtures), [fixtures]);

  useEffect(() => {
    const group = markers.current;
    const m = map.current;
    if (!group || !m || !view) return;
    group.clearLayers();
    getMapItems(index, fixtures, view.bounds, view.zoom).forEach((item) => {
      if (item.type === 'cluster') {
        L.marker([item.latitude, item.longitude], { icon: clusterIcon(item.count), title: `${item.count} fixtures` })
          .on('click', () => {
            if (item.expansionZoom > MAX_SPLIT_ZOOM) handlers.current.onVenuePress?.(item.fixtureIds);
            else m.setView([item.latitude, item.longitude], item.expansionZoom);
          })
          .addTo(group);
        return;
      }
      const f = item.fixture;
      const isSelected = f.id === selectedId;
      L.marker([f.latitude, f.longitude], {
        icon: pillIcon(pinLabel(f.startsAt), getSport(f.sport).color, isSelected),
        zIndexOffset: isSelected ? 1000 : 0,
        title: fixtureTitle(f),
        interactive: interactive,
      })
        .on('click', () => handlers.current.onSelect?.(f.id))
        .addTo(group);
    });
  }, [index, fixtures, selectedId, view, interactive]);

  useEffect(() => {
    const selected = fixtures.find((f) => f.id === selectedId);
    if (selected && !single) map.current?.panTo([selected.latitude, selected.longitude]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    const group = userLayer.current;
    if (!group) return;
    group.clearLayers();
    if (!userLocation) return;
    const at: L.LatLngTuple = [userLocation.latitude, userLocation.longitude];
    if (radiusKm) {
      L.circle(at, { radius: radiusKm * 1000, color: '#059669', weight: 2, fillOpacity: 0.1, interactive: false }).addTo(group);
    }
    L.circleMarker(at, { radius: 8, color: '#fff', weight: 3, fillColor: '#3b82f6', fillOpacity: 1, interactive: false }).addTo(group);
  }, [userLocation, radiusKm]);

  useEffect(() => {
    if (!userLocation) return;
    if (recenterKey || (startOnUser && !startedOnUser.current)) {
      startedOnUser.current = true;
      map.current?.setView([userLocation.latitude, userLocation.longitude], 9);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterKey, userLocation]);

  useEffect(() => {
    if (!fitRadius) return;
    if (!userLocation || !radiusKm) {
      if (hadRadius.current) map.current?.setView([IRELAND.latitude, IRELAND.longitude], 7);
      hadRadius.current = false;
      return;
    }
    hadRadius.current = true;
    map.current?.fitBounds(L.latLng(userLocation.latitude, userLocation.longitude).toBounds(radiusKm * 2200));
  }, [fitRadius, radiusKm, userLocation]);

  useEffect(() => {
    if (!fitKey || fixtures.length === 0) return;
    map.current?.fitBounds(L.latLngBounds(fixtures.map((f) => [f.latitude, f.longitude] as L.LatLngTuple)), {
      paddingTopLeft: [40, 150],
      paddingBottomRight: [40, 150],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  return (
    <View style={[StyleSheet.absoluteFill, style]}>
      <div ref={el} style={{ width: '100%', height: '100%', zIndex: 0 }} />
    </View>
  );
}
