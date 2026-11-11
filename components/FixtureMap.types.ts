import type { StyleProp, ViewStyle } from 'react-native';

import type { Fixture, UserLocation } from '@/types/fixture';

export interface FixtureMapProps {
  fixtures: Fixture[];
  selectedId: string | null;
  onSelect?: (id: string) => void;
  userLocation: UserLocation | null;
  /** Changing this value recentres the map on the user. */
  recenterKey?: number;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const IRELAND = { latitude: 53.4, longitude: -7.9 };
