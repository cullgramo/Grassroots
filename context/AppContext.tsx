import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { SportId } from '@/constants/sports';
import { fixtures as sampleFixtures } from '@/data/fixtures';
import { backendConfigured, fetchFixtures } from '@/lib/fixtures';
import { openingFilters, type Filters, type Fixture, type UserLocation } from '@/types/fixture';
import type { AgeFilter } from '@/utils/ageGroup';
import { filterFixtures } from '@/utils/filterFixtures';
import { widenView } from '@/utils/view';

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
  /** Who the user follows: adult games, underage games, or both. The map opens on this. */
  myAge: AgeFilter;
  setMyAge: (age: AgeFilter) => void;
  /** The view the app opens on, so the Filters button counts only what the user has changed. */
  baseline: Filters;
  /** The county the user chose when location was off. */
  myCounty: string | null;
  /** Choose a county (or null for all of Ireland) and look there instead of near the user. */
  setMyCounty: (county: string | null) => void;
  /** True when location is off and no county is chosen yet, so the map has nowhere sensible to open. */
  needsCounty: boolean;
  /** Said once when the opening view was quiet and the app widened it. */
  viewNote: string | null;
  dismissViewNote: () => void;
  /** Clears every place and time limit: the whole island, any date. */
  showAllIreland: () => void;
  /** Goes up whenever the app itself changes the place, so the map re-fits to the new view. */
  viewKey: number;
}

const SAVED_KEY = 'grassroots.saved';
const SPORTS_KEY = 'grassroots.mySports';
const FIXTURES_KEY = 'grassroots.fixtures';
const AGE_KEY = 'grassroots.myAge';
const COUNTY_KEY = 'grassroots.myCounty';

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [filters, setAll] = useState<Filters>(openingFilters());
  // Set once the user touches any filter, so the app never changes the view under their hands.
  const touched = useRef(false);
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

  const [myAge, setAge] = useState<AgeFilter>('all');
  const [myCounty, setCounty] = useState<string | null>(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [viewKey, setViewKey] = useState(0);
  // The view the app opened on: a widened one counts as the opening view, so the Filters button stays plain.
  const [openingView, setOpeningView] = useState<Filters>(openingFilters());
  const baseline = useMemo(() => ({ ...openingView, age: myAge }), [openingView, myAge]);

  const setFilters = useCallback((patch: Partial<Filters>) => {
    touched.current = true;
    setAll((f) => ({ ...f, ...patch }));
  }, []);
  const resetFilters = useCallback(() => {
    touched.current = true;
    setAll(openingFilters(myAge));
    setOpeningView(openingFilters(myAge));
  }, [myAge]);
  const setMyAge = useCallback(
    (age: AgeFilter) => {
      setAge(age);
      setAll((f) => ({ ...f, age }));
      AsyncStorage.setItem(AGE_KEY, age).catch(() => {});
    },
    []
  );
  const setMyCounty = useCallback((county: string | null) => {
    touched.current = true;
    setCounty(county);
    // A chosen county replaces "near me"; null means the whole island.
    setAll((f) => ({ ...f, county, distanceKm: null }));
    AsyncStorage.setItem(COUNTY_KEY, county ?? '').catch(() => {});
    setViewKey((k) => k + 1);
  }, []);
  const showAllIreland = useCallback(() => {
    touched.current = true;
    setAll((f) => ({ ...f, county: null, distanceKm: null, when: 'any' }));
    setViewKey((k) => k + 1);
  }, []);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(AGE_KEY), AsyncStorage.getItem(COUNTY_KEY)])
      .then(([age, county]) => {
        if (age === 'adult' || age === 'underage' || age === 'all') {
          setAge(age);
          setAll((f) => ({ ...f, age }));
        }
        if (county) setCounty(county);
      })
      .catch(() => {})
      .finally(() => setPrefsLoaded(true));
  }, []);

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

  // Once the fixtures have loaded and we know whether location is on, settle the opening view once:
  // use the chosen county when location is off, then widen it if it is quiet. Never after the user has touched a filter.
  const [viewNote, setViewNote] = useState<string | null>(null);
  const settled = useRef(false);
  useEffect(() => {
    if (settled.current || touched.current || !prefsLoaded || loadState !== 'ready') return;
    if (!location && !locationDenied) return;
    settled.current = true;
    let next = filters;
    if (!location && myCounty) next = { ...next, county: myCounty, distanceKm: null };
    const wider = location || next.county ? widenView(allFixtures, next, location, mySports) : null;
    if (wider) {
      next = wider.filters;
      setViewNote(wider.note);
    }
    if (next !== filters) {
      setAll(next);
      setOpeningView(next);
      setViewKey((k) => k + 1);
    }
  }, [prefsLoaded, loadState, location, locationDenied, myCounty, allFixtures, mySports, filters]);

  const needsCounty = prefsLoaded && locationDenied && !myCounty && !filters.county && !touched.current;
  const dismissViewNote = useCallback(() => setViewNote(null), []);

  const fixtures = useMemo(
    () => filterFixtures(allFixtures, filters, location, new Date(), mySports),
    [allFixtures, filters, location, mySports]
  );

  const value = useMemo(
    () => ({ filters, setFilters, resetFilters, location, locationDenied, requestLocation, fixtures, allFixtures, loadState, isStale, refreshing, refresh, savedIds, toggleSaved, mySports, setMySports, needsSportsChoice, myAge, setMyAge, baseline, myCounty, setMyCounty, needsCounty, viewNote, dismissViewNote, showAllIreland, viewKey }),
    [filters, setFilters, resetFilters, location, locationDenied, requestLocation, fixtures, allFixtures, loadState, isStale, refreshing, refresh, savedIds, toggleSaved, mySports, setMySports, needsSportsChoice, myAge, setMyAge, baseline, myCounty, setMyCounty, needsCounty, viewNote, dismissViewNote, showAllIreland, viewKey]
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
