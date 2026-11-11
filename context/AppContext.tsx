import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { SportId } from '@/constants/sports';
import { fixtures as sampleFixtures } from '@/data/fixtures';
import { backendConfigured, fetchFixtures } from '@/lib/fixtures';
import { DEFAULT_FILTERS, type Filters, type Fixture, type UserLocation } from '@/types/fixture';
import { filterFixtures } from '@/utils/filterFixtures';

interface AppState {
  filters: Filters;
  setFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
  location: UserLocation | null;
  locationDenied: boolean;
  requestLocation: () => Promise<void>;
  /** Fixtures after the current filters. */
  fixtures: Fixture[];
  /** Every loaded fixture, unfiltered. */
  allFixtures: Fixture[];
  loadState: 'loading' | 'ready' | 'error';
  /** True when showing a copy saved on the phone because the latest could not be loaded. */
  isStale: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
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
const FIXTURES_KEY = 'grassroots.fixtures';

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

  const [allFixtures, setAllFixtures] = useState<Fixture[]>(backendConfigured ? [] : sampleFixtures);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(backendConfigured ? 'loading' : 'ready');
  const [isStale, setIsStale] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!backendConfigured) return;
    try {
      const fresh = await fetchFixtures();
      setAllFixtures(fresh);
      setIsStale(false);
      setLoadState('ready');
      AsyncStorage.setItem(FIXTURES_KEY, JSON.stringify(fresh)).catch(() => {});
    } catch {
      // Keep whatever is already showing; only report an error when there is nothing to show.
      setLoadState((state) => (state === 'ready' ? 'ready' : 'error'));
      setIsStale(true);
    }
  }, []);

  useEffect(() => {
    if (!backendConfigured) return;
    AsyncStorage.getItem(FIXTURES_KEY)
      .then((raw) => {
        if (!raw) return;
        setAllFixtures((current) => (current.length > 0 ? current : JSON.parse(raw)));
        setLoadState((state) => (state === 'loading' ? 'ready' : state));
      })
      .catch(() => {})
      .finally(load);
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setLoadState((state) => (state === 'error' ? 'loading' : state));
    await load();
    setRefreshing(false);
  }, [load]);

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
    [allFixtures, filters, location, mySports]
  );

  const value = useMemo(
    () => ({ filters, setFilters, resetFilters, location, locationDenied, requestLocation, fixtures, allFixtures, loadState, isStale, refreshing, refresh, savedIds, toggleSaved, mySports, setMySports, needsSportsChoice }),
    [filters, setFilters, resetFilters, location, locationDenied, requestLocation, fixtures, allFixtures, loadState, isStale, refreshing, refresh, savedIds, toggleSaved, mySports, setMySports, needsSportsChoice]
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
