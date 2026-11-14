import { useEffect, useState, type ComponentType } from 'react';
import { View } from 'react-native';

import type { FixtureMapProps } from './FixtureMap.types';

/**
 * The web map, loaded only in the browser. Leaflet needs a browser window the moment it loads, and web pages are
 * now also built on the server (so a shared fixture link can carry a preview), where there is no window.
 */
export function FixtureMap(props: FixtureMapProps) {
  const [Map, setMap] = useState<ComponentType<FixtureMapProps> | null>(null);
  useEffect(() => {
    let live = true;
    import('./LeafletMap').then((m) => live && setMap(() => m.LeafletMap));
    return () => {
      live = false;
    };
  }, []);
  if (!Map) return <View style={{ flex: 1, backgroundColor: '#e5e7eb' }} />;
  return <Map {...props} />;
}
