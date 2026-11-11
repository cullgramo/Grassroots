import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { SportId } from '@/constants/sports';
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
  savedIds: string[];
  toggleSaved: (id: string) => void;
  /** Sports the user follows. Empty means every sport. */
  mySports: SportId[];
  setMySports: (ids: SportId[]) => void;
  /** True once we know the user has never chosen their sports. */
  needsSportsChoice: boolean;
}

const SAVED_KEY = 'grassroots.saved';
const SPORTS_KEY = 'grassroots.mySports';

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

  const [savedIds, setSavedIds] = useState<string[]>([]);
  useEffect(() => {
    AsyncStorage.getItem(SAVED_KEY)
      .then((raw) => raw && setSavedIds(JSON.parse(raw)))
      .catch(() => {});
  }, []);
  const toggleSaved = useCallback((id: string) => {
    setSavedIds((ids) => {
      const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      AsyncStorage.setItem(SAVED_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setFilters = useCallback((patch: Partial<Filters>) => setAll((f) => ({ ...f, ...patch })), []);
  const resetFilters = useCallback(() => setAll(DEFAULT_FILTERS), []);

  const [mySports, setMine] = useState<SportId[]>([]);
  const [needsSportsChoice, setNeedsSportsChoice] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(SPORTS_KEY)
      .then((raw) => (raw ? setMine(JSON.parse(raw)) : setNeedsSportsChoice(true)))
      .catch(() => {});
  }, []);
  const setMySports = useCallback((ids: SportId[]) => {
    setMine(ids);
    setNeedsSportsChoice(false);
    AsyncStorage.setItem(SPORTS_KEY, JSON.stringify(ids)).catch(() => {});
  }, []);

  const fixtures = useMemo(
    () => filterFixtures(allFixtures, filters, location, new Date(), mySports),
    [filters, location, mySports]
  );

  const value = useMemo(
    () => ({ filters, setFilters, resetFilters, location, locationDenied, requestLocation, fixtures, savedIds, toggleSaved, mySports, setMySports, needsSportsChoice }),
    [filters, setFilters, resetFilters, location, locationDenied, requestLocation, fixtures, savedIds, toggleSaved, mySports, setMySports, needsSportsChoice]
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
