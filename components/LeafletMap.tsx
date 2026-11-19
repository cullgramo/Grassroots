// The web map. Leaflet reads the browser window as soon as it loads, so it is only loaded in the browser,
// through FixtureMap.web.tsx; the server never imports this file while building pages.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MAPTILER_KEY } from '@/lib/config';
import { flushMove, hasSize, refreshMap, whenSized } from '@/lib/mapRefresh';
import { getTileSource } from '@/lib/mapTiles';
import { getSport } from '@/constants/sports';
import { fixtureTitle } from '@/types/fixture';
import { buildClusterIndex, getMapItems, MAX_SPLIT_ZOOM } from '@/utils/cluster';
import { pinLabelFor } from '@/utils/date';
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

// The island of Ireland, corner to corner.
const ISLAND: L.LatLngBoundsExpression = [[51.4, -10.6], [55.4, -5.4]];

type Inset = { top: number; bottom: number };

/** The inset to use: none when what is left of the map would be too thin to show anything (a very small window). */
function usable(m: L.Map, inset: Inset): Inset {
  return m.getSize().y - inset.top - inset.bottom < 80 ? { top: 0, bottom: 0 } : inset;
}

/** The ground people can actually see: the map without the strips hidden under the controls and the list. */
function visibleBounds(m: L.Map, inset: Inset): Bounds {
  const { top, bottom } = usable(m, inset);
  const size = m.getSize();
  const nw = m.containerPointToLatLng([0, top]);
  const se = m.containerPointToLatLng([size.x, size.y - bottom]);
  return { north: nw.lat, south: se.lat, east: se.lng, west: nw.lng };
}

// The widest the app ever zooms out by itself: the step at which the island fills a phone screen.
const WIDEST = 7;

/**
 * Shows an area in the visible part of the map, with `side` and `air` points of room around it. The map only zooms in
 * whole steps (half steps leave hairlines between its tiles), and on a narrow phone the step that holds every corner
 * of the island leaves it small in a sea of blue. So the app never zooms out past the step where the island fills
 * the screen, even though the far west and east coasts then run just off the sides.
 */
function showArea(m: L.Map, inset: Inset, area: L.LatLngBoundsExpression, side: number, air: number, closest = 18) {
  const { top, bottom } = usable(m, inset);
  const bounds = L.latLngBounds(area as L.LatLngBoundsLiteral);
  const zoom = Math.min(closest, Math.max(WIDEST, m.getBoundsZoom(bounds, false, L.point(side * 2, top + bottom + air * 2))));
  m.setView(centreFor(m, inset, bounds.getCenter(), zoom), zoom);
}

/** The map centre that puts `at` in the middle of the visible part, not the middle of the whole map. */
function centreFor(m: L.Map, inset: Inset, at: L.LatLngExpression, zoom: number): L.LatLng {
  const { top, bottom } = usable(m, inset);
  return m.unproject(m.project(at, zoom).add([0, (bottom - top) / 2]), zoom);
}

// Web stand-in for the native map, so the app can be previewed in a browser.
export function LeafletMap({
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
  attributionBottom = 0,
  inset,
  timeOnly = false,
  style,
}: FixtureMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const userLayer = useRef<L.LayerGroup | null>(null);
  const report = useRef<() => void>(() => {});
  const startedOnUser = useRef(false);
  const hadRadius = useRef(false);
  // A fit or recentre asked for while Explore is covered (the first-run sports screen) waits here.
  const heldMove = useRef<(() => void) | null>(null);
  const runWhenSized = useCallback((move: (m: L.Map) => void) => {
    whenSized(el.current, heldMove, () => {
      const m = map.current;
      if (!m) return;
      // Leaflet still has the old size until asked. Measure, then move, or the zoom is worked out from nothing.
      m.invalidateSize(false);
      move(m);
    });
  }, []);
  const insetRef = useRef<Inset>({ top: inset?.top ?? 0, bottom: inset?.bottom ?? 0 });
  // The last move the app itself made (a fit to the search circle, to a county, to search results). It is made again
  // when the list covers more or less of the map. Once the user moves the map by hand it is forgotten: their view wins.
  const lastFit = useRef<((m: L.Map) => void) | null>(null);
  // True while the app, not the user, is moving the map.
  const moving = useRef(false);
  // One change can ask for two fits at once (choosing a county turns the search circle off, which asks for the whole
  // island, and also asks for that county's fixtures). Leaflet ignores a move asked for while another is under way,
  // so the first asked would win. Fits are therefore held for a moment and only the last one asked is made.
  const waiting = useRef<((m: L.Map) => void) | null>(null);
  const fit = useCallback(
    (move: (m: L.Map) => void) => {
      lastFit.current = move;
      const first = waiting.current === null;
      waiting.current = move;
      if (!first) return;
      requestAnimationFrame(() => {
        const latest = waiting.current;
        waiting.current = null;
        if (!latest) return;
        runWhenSized((m) => {
          moving.current = true;
          setTimeout(() => (moving.current = false), 1500);
          latest(m);
        });
      });
    },
    [runWhenSized]
  );
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
      attributionControl: false,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      keyboard: interactive,
    }).setView(
      single ? [single.latitude, single.longitude] : [IRELAND.latitude, IRELAND.longitude],
      single ? 14 : 7
    );
    const tiles = getTileSource(MAPTILER_KEY);
    if (!MAPTILER_KEY && __DEV__) console.warn('EXPO_PUBLIC_MAPTILER_KEY is not set; the web map is using OpenStreetMap tiles.');
    L.tileLayer(tiles.url, tiles.options).addTo(m);
    // Bottom left, so it clears the locate button on the right; the screen lifts it above the bottom sheet.
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(m);
    userLayer.current = L.layerGroup().addTo(m);
    markers.current = L.layerGroup().addTo(m);
    map.current = m;
    const read = () => {
      // A hidden map has no size, so its bounds cover no ground; wait for it to come back rather than report that.
      if (!hasSize(m.getContainer())) return;
      // Pins are drawn for the whole map, so one half under the list's edge still shows; the list is told only about
      // the part people can see.
      setView({ bounds: toBounds(m), zoom: m.getZoom() });
      handlers.current.onBoundsChange?.(visibleBounds(m, insetRef.current));
    };
    report.current = read;
    // Open on the whole island, inside the part of the map that can be seen (a single fixture's own map stays on it).
    if (!single) fit((mm) => showArea(mm, insetRef.current, ISLAND, 6, 6));
    m.on('moveend', () => {
      moving.current = false;
      read();
    });
    m.on('dragstart', () => (lastFit.current = null));
    m.on('zoomstart', () => {
      if (!moving.current) lastFit.current = null;
    });
    m.on('click', () => handlers.current.onSelect?.(null));
    read();
    // The map's box changes when its screen is covered and uncovered, and when the window resizes.
    const watcher = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
      // The waiting fit must run before the bounds are read, so the count is for the place we actually show.
      flushMove(m.getContainer(), heldMove);
      refreshMap(m, m.getContainer(), read);
    }) : null;
    watcher?.observe(el.current);
    return () => {
      watcher?.disconnect();
      report.current = () => {};
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Coming back to this screen from another one: re-measure and re-read the bounds so the count is right.
  useFocusEffect(
    useCallback(() => {
      const fix = () => {
        flushMove(el.current, heldMove);
        refreshMap(map.current, el.current, report.current);
      };
      fix();
      const id = requestAnimationFrame(fix);
      return () => cancelAnimationFrame(id);
    }, [])
  );

  useEffect(() => {
    const corner = el.current?.querySelector<HTMLElement>('.leaflet-bottom.leaflet-left');
    if (corner) corner.style.bottom = `${attributionBottom}px`;
  }, [attributionBottom]);

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
            else {
              lastFit.current = null;
              m.setView(centreFor(m, insetRef.current, [item.latitude, item.longitude], item.expansionZoom), item.expansionZoom);
            }
          })
          .addTo(group);
        return;
      }
      const f = item.fixture;
      const isSelected = f.id === selectedId;
      L.marker([f.latitude, f.longitude], {
        icon: pillIcon(pinLabelFor(f, undefined, timeOnly), getSport(f.sport).color, isSelected),
        zIndexOffset: isSelected ? 1000 : 0,
        title: fixtureTitle(f),
        interactive: interactive,
      })
        .on('click', () => handlers.current.onSelect?.(f.id))
        .addTo(group);
    });
  }, [index, fixtures, selectedId, view, interactive, timeOnly]);

  useEffect(() => {
    const selected = fixtures.find((f) => f.id === selectedId);
    const m = map.current;
    if (!selected || single || !m) return;
    // The chosen pin goes to the middle of what can be seen, so it is never left behind the list.
    lastFit.current = null;
    m.panTo(centreFor(m, insetRef.current, [selected.latitude, selected.longitude], m.getZoom()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // The list was pulled up or let down, or the controls grew: keep the same ground in the part that can be seen.
  useEffect(() => {
    const next = { top: inset?.top ?? 0, bottom: inset?.bottom ?? 0 };
    const prev = insetRef.current;
    if (prev.top === next.top && prev.bottom === next.bottom) return;
    insetRef.current = next;
    const m = map.current;
    if (!m) return;
    if (lastFit.current) fit(lastFit.current);
    else if (hasSize(m.getContainer())) m.panBy([0, (next.bottom - prev.bottom - (next.top - prev.top)) / 2]);
    report.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inset?.top, inset?.bottom]);

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
      const at: L.LatLngTuple = [userLocation.latitude, userLocation.longitude];
      fit((m) => m.setView(centreFor(m, insetRef.current, at, 9), 9));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterKey, userLocation]);

  useEffect(() => {
    if (!fitRadius) return;
    if (!userLocation || !radiusKm) {
      if (hadRadius.current) {
        fit((m) => showArea(m, insetRef.current, ISLAND, 6, 6));
      }
      hadRadius.current = false;
      return;
    }
    hadRadius.current = true;
    // The square that just holds the search circle; the padding keeps all of it clear of the controls and the list.
    const around = L.latLng(userLocation.latitude, userLocation.longitude).toBounds(radiusKm * 2000);
    fit((m) => showArea(m, insetRef.current, around, 14, 14));
  }, [fitRadius, radiusKm, userLocation, fit]);

  useEffect(() => {
    if (!fitKey || fixtures.length === 0) return;
    const bounds = L.latLngBounds(fixtures.map((f) => [f.latitude, f.longitude] as L.LatLngTuple));
    // The closest it goes is 15, so one result (a single ground) is not shown at street-corner scale.
    fit((m) => showArea(m, insetRef.current, bounds, 40, 34, 15));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  useEffect(() => {
    if (!placeKey) return;
    if (fitRadius && userLocation && radiusKm) {
      const around = L.latLng(userLocation.latitude, userLocation.longitude).toBounds(radiusKm * 2000);
      fit((m) => showArea(m, insetRef.current, around, 14, 14));
    } else if (fixtures.length > 0) {
      const bounds = L.latLngBounds(fixtures.map((f) => [f.latitude, f.longitude] as L.LatLngTuple));
      fit((m) => showArea(m, insetRef.current, bounds, 40, 34, 15));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeKey]);

  return (
    <View style={[StyleSheet.absoluteFill, style]}>
      <div ref={el} style={{ width: '100%', height: '100%', zIndex: 0 }} />
    </View>
  );
}
