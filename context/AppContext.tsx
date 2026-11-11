import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { fixtures as allFixtures } from '@/data/fixtures';
import { DEFAULT_FILTERS, type Filters, type Fixture, type UserLocation } from '@/types/fixture';
import { filterFixtures } from '@/utils/filterFixtures';

interface AppState {
  filters: Filters;
  setFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
  location: UserLocation | null;
  locationDenied: boolean;
  requestLocation: () => Promise<void>;
  fixtures: Fixture[];
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [filters, setAll] = useState<Filters>(DEFAULT_FILTERS);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  const requestLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setLocationDenied(false);
      setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch {
      setLocationDenied(true);
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const setFilters = useCallback((patch: Partial<Filters>) => setAll((f) => ({ ...f, ...patch })), []);
  const resetFilters = useCallback(() => setAll(DEFAULT_FILTERS), []);

  const fixtures = useMemo(() => filterFixtures(allFixtures, filters, location), [filters, location]);

  const value = useMemo(
    () => ({ filters, setFilters, resetFilters, location, locationDenied, requestLocation, fixtures }),
    [filters, setFilters, resetFilters, location, locationDenied, requestLocation, fixtures]
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
