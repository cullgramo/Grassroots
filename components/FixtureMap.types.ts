import type { StyleProp, ViewStyle } from 'react-native';

import type { Fixture, UserLocation } from '@/types/fixture';
import type { Bounds } from '@/utils/filterFixtures';

export interface FixtureMapProps {
  fixtures: Fixture[];
  selectedId: string | null;
  /** Called with a fixture id when a pin is tapped, or null when the map background is tapped. */
  onSelect?: (id: string | null) => void;
  /** Called when a cluster that cannot be split by zooming (games at one venue) is tapped. */
  onVenuePress?: (fixtureIds: string[]) => void;
  onBoundsChange?: (bounds: Bounds) => void;
  userLocation: UserLocation | null;
  /** Draws a search-radius circle around the user. */
  radiusKm?: number | null;
  /** Keeps the whole search radius (or the whole country, with no radius) in view. */
  fitRadius?: boolean;
  /** Opens on the user's position once it is known, instead of the whole country. */
  startOnUser?: boolean;
  /** Changing this value recentres the map on the user. */
  recenterKey?: number;
  /** Changing this value zooms out to show every fixture. */
  fitKey?: number;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const IRELAND = { latitude: 53.4, longitude: -7.9 };
export const PIN_DARK = '#0f172a';
