import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState as PhoneState } from 'react-native';

import type { SportId } from '@/constants/sports';
import { fixtures as sampleFixtures } from '@/data/fixtures';
import type { SyncedData } from '@/lib/accountData';
import { loadFixtureCache, saveFixtureCache } from '@/lib/cache';
import { backendConfigured, fetchFixtures } from '@/lib/fixtures';
import { askForReminders, clearReminders, remindersSupported, syncReminders, type ReminderPermission } from '@/lib/reminders';
import { report, reportTo } from '@/lib/report';
import { openingFilters, type Filters, type Fixture, type UserLocation } from '@/types/fixture';
import type { AgeFilter } from '@/utils/ageGroup';
import { isGenderFilter, type GenderFilter } from '@/utils/category';
import type { MapStyle } from '@/components/FixtureMap.types';
import type { FollowedClub } from '@/utils/club';
import { dayHasPassed } from '@/utils/days';
import { filterFixtures, type Sort } from '@/utils/filterFixtures';
import { isPlayed } from '@/utils/played';
import { planReminders } from '@/utils/reminders';
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
  /** Every fixture still to be played, soonest first, whatever the filters say. Search and club pages read this. */
  upcoming: Fixture[];
  savedIds: string[];
  toggleSaved: (id: string) => void;
  /** The order of the lists: by time, or nearest first. One choice for the map's list and the List tab. */
  sort: Sort;
  setSort: (sort: Sort) => void;
  /** Clubs the user follows, kept on the phone. */
  followedClubs: FollowedClub[];
  toggleFollow: (club: FollowedClub) => void;
  /** The street map or satellite imagery. Remembered on the phone. */
  mapStyle: MapStyle;
  setMapStyle: (style: MapStyle) => void;
  /** True when the phone reminds the user before starred games and followed clubs' games. Always false on the website. */
  remindersOn: boolean;
  /**
   * Switches reminders on or off. Switching on asks the phone's permission first and answers with what the phone said:
   * anything but 'granted' means reminders stayed off.
   */
  setRemindersOn: (on: boolean) => Promise<ReminderPermission>;
  /** Sports the user follows. Empty means every sport. */
  mySports: SportId[];
  setMySports: (ids: SportId[]) => void;
  /** True once we know the user has never chosen their sports. */
  needsSportsChoice: boolean;
  /** Who the user follows: adult games, underage games, or both. The map opens on this. */
  myAge: AgeFilter;
  setMyAge: (age: AgeFilter) => void;
  /** Men & Boys, Women & Girls, or both. The map opens on this. */
  myGender: GenderFilter;
  setMyGender: (gender: GenderFilter) => void;
  /** The view the app opens on, so the Filters button counts only what the user has changed. */
  baseline: Filters;
  /** The county the user chose when location was off. */
  myCounty: string | null;
  /** Choose a county (or null for all of Ireland) and look there instead of near the user. */
  setMyCounty: (county: string | null) => void;
  /** Sets where to look: a distance from the user, one county, or (both null) the whole island. The map moves to match. */
  choosePlace: (place: { county: string | null; distanceKm: number | null }) => void;
  /** True when location is off and no county is chosen yet, so the map has nowhere sensible to open. */
  needsCounty: boolean;
  /** Said once when the opening view was quiet and the app widened it. */
  viewNote: string | null;
  dismissViewNote: () => void;
  /** Clears every place and time limit: the whole island, any date. */
  showAllIreland: () => void;
  /** Goes up whenever the app itself changes the place, so the map re-fits to the new view. */
  viewKey: number;
  /** What a signed-in account keeps in step across devices (context/AccountContext.tsx). */
  syncedData: SyncedData;
  /** True once the phone's saved choices have been read, so an account never overwrites them with blanks. */
  syncedLoaded: boolean;
  /** Puts an account's data on this phone, replacing the phone's own copy of those choices. */
  applySyncedData: (data: SyncedData) => void;
}

const SAVED_KEY = 'grassroots.saved';
const CLUBS_KEY = 'grassroots.clubs';
const REMINDERS_KEY = 'grassroots.reminders';
const MAP_STYLE_KEY = 'grassroots.mapStyle';
const SPORTS_KEY = 'grassroots.mySports';
const AGE_KEY = 'grassroots.myAge';
const GENDER_KEY = 'grassroots.myGender';
const COUNTY_KEY = 'grassroots.myCounty';

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [filters, setAll] = useState<Filters>(openingFilters());
  // Set once the user touches any filter, so the app never changes the view under their hands.
  const touched = useRef(false);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  // A short line above the map saying why the view is what it is, or what to do about location.
  const [viewNote, setViewNote] = useState<string | null>(null);

  const requestLocation = useCallback(async () => {
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        // The phone will not ask a second time, so pressing the button again would do nothing: say what to do.
        if (canAskAgain === false) setViewNote('Location is switched off for Grassroots. Turn it on in your settings, or pick a county in Filters.');
        return;
      }
      // A phone with a weak signal can take minutes to find itself; give up after 15 seconds and say so.
      const pos = await Promise.race([
        Location.getCurrentPositionAsync({}),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('location timed out')), 15_000)),
      ]);
      setLocationDenied(false);
      setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch (e) {
      report(e, 'reading the phone\'s location');
      setViewNote('Could not find your location just now. Try again, or pick a county in Filters.');
      setLocationDenied(true);
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savedLoaded, setSavedLoaded] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(SAVED_KEY)
      .then((raw) => raw && setSavedIds(JSON.parse(raw)))
      .catch(reportTo('reading saved fixtures'))
      .finally(() => setSavedLoaded(true));
  }, []);
  const toggleSaved = useCallback((id: string) => {
    setSavedIds((ids) => {
      const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      AsyncStorage.setItem(SAVED_KEY, JSON.stringify(next)).catch(reportTo('saving a saved fixture'));
      return next;
    });
  }, []);

  const [sort, setSort] = useState<Sort>('time');

  const [followedClubs, setFollowedClubs] = useState<FollowedClub[]>([]);
  const [clubsLoaded, setClubsLoaded] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(CLUBS_KEY)
      .then((raw) => {
        const list = raw ? JSON.parse(raw) : null;
        if (Array.isArray(list)) setFollowedClubs(list.filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string' && typeof c.group === 'string'));
      })
      .catch(reportTo('reading followed clubs'))
      .finally(() => setClubsLoaded(true));
  }, []);
  const toggleFollow = useCallback((club: FollowedClub) => {
    setFollowedClubs((list) => {
      const next = list.some((c) => c.id === club.id) ? list.filter((c) => c.id !== club.id) : [...list, { id: club.id, name: club.name, group: club.group }];
      AsyncStorage.setItem(CLUBS_KEY, JSON.stringify(next)).catch(reportTo('saving a followed club'));
      return next;
    });
  }, []);

  const [myAge, setAge] = useState<AgeFilter>('all');
  const [myGender, setGender] = useState<GenderFilter>('all');
  const [myCounty, setCounty] = useState<string | null>(null);
  // True once the county question has been answered, including with "Show all Ireland", so it is not asked on every launch.
  const [countyAsked, setCountyAsked] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [viewKey, setViewKey] = useState(0);
  // The view the app opened on: a widened one counts as the opening view, so the Filters button stays plain.
  const [openingView, setOpeningView] = useState<Filters>(openingFilters());
  const baseline = useMemo(() => ({ ...openingView, age: myAge, gender: myGender }), [openingView, myAge, myGender]);

  const setFilters = useCallback((patch: Partial<Filters>) => {
    touched.current = true;
    setAll((f) => ({ ...f, ...patch }));
  }, []);
  const resetFilters = useCallback(() => {
    touched.current = true;
    setAll(openingFilters(myAge, myGender));
    setOpeningView(openingFilters(myAge, myGender));
  }, [myAge, myGender]);
  const setMyAge = useCallback(
    (age: AgeFilter) => {
      setAge(age);
      setAll((f) => ({ ...f, age }));
      AsyncStorage.setItem(AGE_KEY, age).catch(reportTo('saving the age choice'));
    },
    []
  );
  const setMyGender = useCallback((gender: GenderFilter) => {
    setGender(gender);
    setAll((f) => ({ ...f, gender }));
    AsyncStorage.setItem(GENDER_KEY, gender).catch(reportTo('saving the men and women choice'));
  }, []);
  const setMyCounty = useCallback((county: string | null) => {
    touched.current = true;
    setCountyAsked(true);
    setCounty(county);
    // A chosen county replaces "near me"; null means the whole island.
    setAll((f) => ({ ...f, county, distanceKm: null }));
    AsyncStorage.setItem(COUNTY_KEY, county ?? '').catch(reportTo('saving the county choice'));
    setViewKey((k) => k + 1);
  }, []);
  const showAllIreland = useCallback(() => {
    touched.current = true;
    setAll((f) => ({ ...f, county: null, distanceKm: null, when: 'any', day: null }));
    setViewKey((k) => k + 1);
  }, []);
  const choosePlace = useCallback(
    (place: { county: string | null; distanceKm: number | null }) => {
      touched.current = true;
      setAll((f) => ({ ...f, county: place.county, distanceKm: place.county ? null : place.distanceKm }));
      // With location off, the county someone picks is their home county: remember it, so the app opens there next time.
      if (place.county && !location) {
        setCountyAsked(true);
        setCounty(place.county);
        AsyncStorage.setItem(COUNTY_KEY, place.county).catch(reportTo('saving the county choice'));
      }
      // A county or the whole island has no circle to fit, so the map is asked to show everything there. A distance fits its own circle.
      if (place.county || place.distanceKm == null) setViewKey((k) => k + 1);
    },
    [location]
  );

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(AGE_KEY), AsyncStorage.getItem(COUNTY_KEY), AsyncStorage.getItem(GENDER_KEY)])
      .then(([age, county, gender]) => {
        if (isGenderFilter(gender)) {
          setGender(gender);
          setAll((f) => ({ ...f, gender }));
        }
        if (age === 'adult' || age === 'underage' || age === 'all') {
          setAge(age);
          setAll((f) => ({ ...f, age }));
        }
        if (county !== null) setCountyAsked(true);
        if (county) setCounty(county);
      })
      .catch(reportTo('reading saved preferences'))
      .finally(() => setPrefsLoaded(true));
  }, []);

  const [allFixtures, setAllFixtures] = useState<Fixture[]>(backendConfigured ? [] : sampleFixtures);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(backendConfigured ? 'loading' : 'ready');
  const [isStale, setIsStale] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Each load gets a number, and only the newest one may update the screen: a slow, older answer arriving after a
  // newer one (a refresh pulled during start-up) must not put old data back.
  const latestLoad = useRef(0);
  const lastLoaded = useRef(0);
  const load = useCallback(async () => {
    if (!backendConfigured) return;
    const mine = ++latestLoad.current;
    try {
      const fresh = await fetchFixtures();
      if (mine !== latestLoad.current) return;
      lastLoaded.current = Date.now();
      setAllFixtures(fresh);
      setIsStale(false);
      setLoadState('ready');
      saveFixtureCache(fresh).catch(reportTo('saving the fixture copy on the phone'));
    } catch (e) {
      if (mine !== latestLoad.current) return;
      report(e, 'loading fixtures');
      // Keep whatever is already showing; only report an error when there is nothing to show.
      setLoadState((state) => (state === 'ready' ? 'ready' : 'error'));
      setIsStale(true);
    }
  }, []);

  useEffect(() => {
    if (!backendConfigured) return;
    loadFixtureCache()
      .then((saved) => {
        if (!saved) return;
        setAllFixtures((current) => (current.length > 0 ? current : saved));
        setLoadState((state) => (state === 'loading' ? 'ready' : state));
      })
      .catch(reportTo('reading the fixture copy on the phone'))
      .finally(load);
  }, [load]);

  // An app left open, or brought back from the background, must not keep showing this morning's "today" or games
  // that have since been played: the clock ticks every five minutes and on return, and data over half an hour old
  // is fetched again.
  const [clock, setClock] = useState(0);
  useEffect(() => {
    const tick = setInterval(() => setClock((c) => c + 1), 5 * 60_000);
    const sub = PhoneState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      setClock((c) => c + 1);
      if (backendConfigured && Date.now() - lastLoaded.current > 30 * 60_000) load();
    });
    return () => {
      clearInterval(tick);
      sub.remove();
    };
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setLoadState((state) => (state === 'error' ? 'loading' : state));
    await load();
    setRefreshing(false);
  }, [load]);

  const [mySports, setMine] = useState<SportId[]>([]);
  const [needsSportsChoice, setNeedsSportsChoice] = useState(false);
  const [sportsLoaded, setSportsLoaded] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(SPORTS_KEY)
      .then((raw) => (raw ? setMine(JSON.parse(raw)) : setNeedsSportsChoice(true)))
      .catch(reportTo('reading the sports choice'))
      .finally(() => setSportsLoaded(true));
  }, []);
  const setMySports = useCallback((ids: SportId[]) => {
    setMine(ids);
    setNeedsSportsChoice(false);
    AsyncStorage.setItem(SPORTS_KEY, JSON.stringify(ids)).catch(reportTo('saving the sports choice'));
  }, []);

  // Once the fixtures have loaded and we know whether location is on, settle the opening view once:
  // use the chosen county when location is off, then widen it if it is quiet. Never after the user has touched a filter.
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

  // A chosen day that has gone by (the app was left open overnight) falls back to the weekend.
  useEffect(() => {
    if (dayHasPassed(filters)) setAll((f) => ({ ...f, when: 'weekend', day: null }));
  }, [filters, clock]);

  const needsCounty = prefsLoaded && locationDenied && !myCounty && !countyAsked && !filters.county && !touched.current;
  const dismissViewNote = useCallback(() => setViewNote(null), []);

  const fixtures = useMemo(
    () => filterFixtures(allFixtures, filters, location, new Date(), mySports),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the clock is a dependency on purpose: time passing changes the answer
    [allFixtures, filters, location, mySports, clock]
  );

  const upcoming = useMemo(() => {
    const now = new Date();
    return allFixtures.filter((f) => !isPlayed(f, now)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the clock is a dependency on purpose
  }, [allFixtures, clock]);

  const [mapStyle, setMapStyleState] = useState<MapStyle>('map');
  useEffect(() => {
    AsyncStorage.getItem(MAP_STYLE_KEY)
      .then((raw) => raw === 'satellite' && setMapStyleState('satellite'))
      .catch(reportTo('reading the map view choice'));
  }, []);
  const setMapStyle = useCallback((style: MapStyle) => {
    setMapStyleState(style);
    AsyncStorage.setItem(MAP_STYLE_KEY, style).catch(reportTo('saving the map view choice'));
  }, []);

  // Game reminders: the phone holds one for each starred fixture and each followed club's fixture. Whenever the
  // fixtures, the stars or the followed clubs change, the phone's list is brought back in line.
  const [remindersOn, setRemindersFlag] = useState(false);
  useEffect(() => {
    if (!remindersSupported) return;
    AsyncStorage.getItem(REMINDERS_KEY)
      .then((raw) => setRemindersFlag(raw === 'on'))
      .catch(reportTo('reading the reminders choice'));
  }, []);
  const setRemindersOn = useCallback(async (on: boolean): Promise<ReminderPermission> => {
    if (!on) {
      setRemindersFlag(false);
      AsyncStorage.setItem(REMINDERS_KEY, 'off').catch(reportTo('saving the reminders choice'));
      clearReminders().catch(reportTo('removing game reminders'));
      return 'granted';
    }
    const answer = await askForReminders();
    if (answer === 'granted') {
      setRemindersFlag(true);
      AsyncStorage.setItem(REMINDERS_KEY, 'on').catch(reportTo('saving the reminders choice'));
    }
    return answer;
  }, []);
  // The plan is worked out again every few minutes as the clock ticks; the phone is only touched when it changes.
  const lastSynced = useRef<string | null>(null);
  const haveFixtures = allFixtures.length > 0;
  useEffect(() => {
    // With nothing loaded there is nothing to plan from, and syncing would wipe reminders that are still right.
    if (!remindersOn || !haveFixtures) {
      lastSynced.current = null;
      return;
    }
    const plan = planReminders(upcoming, savedIds, followedClubs);
    const key = plan.map((r) => r.id).join('|');
    if (key === lastSynced.current) return;
    lastSynced.current = key;
    syncReminders(plan).catch(reportTo('setting game reminders'));
  }, [remindersOn, haveFixtures, upcoming, savedIds, followedClubs]);

  const syncedLoaded = savedLoaded && clubsLoaded && sportsLoaded && prefsLoaded;
  const syncedData = useMemo<SyncedData>(
    () => ({ saved: savedIds, clubs: followedClubs, sports: mySports, age: myAge, gender: myGender, county: myCounty }),
    [savedIds, followedClubs, mySports, myAge, myGender, myCounty]
  );
  const applySyncedData = useCallback(
    (d: SyncedData) => {
      setSavedIds(d.saved);
      AsyncStorage.setItem(SAVED_KEY, JSON.stringify(d.saved)).catch(reportTo('saving a saved fixture'));
      setFollowedClubs(d.clubs);
      AsyncStorage.setItem(CLUBS_KEY, JSON.stringify(d.clubs)).catch(reportTo('saving a followed club'));
      setMySports(d.sports as SportId[]);
      setMyAge(d.age);
      setMyGender(d.gender);
      // The home county is remembered, but the map is not moved under the person's hands.
      if (d.county) {
        setCountyAsked(true);
        setCounty(d.county);
        AsyncStorage.setItem(COUNTY_KEY, d.county).catch(reportTo('saving the county choice'));
      }
    },
    [setMySports, setMyAge, setMyGender]
  );

  const value = useMemo(
    () => ({ filters, setFilters, resetFilters, location, locationDenied, requestLocation, fixtures, allFixtures, upcoming, loadState, isStale, refreshing, refresh, savedIds, toggleSaved, sort, setSort, followedClubs, toggleFollow, mapStyle, setMapStyle, remindersOn, setRemindersOn, mySports, setMySports, needsSportsChoice, myAge, setMyAge, myGender, setMyGender, baseline, myCounty, setMyCounty, choosePlace, needsCounty, viewNote, dismissViewNote, showAllIreland, viewKey, syncedData, syncedLoaded, applySyncedData }),
    [filters, setFilters, resetFilters, location, locationDenied, requestLocation, fixtures, allFixtures, upcoming, loadState, isStale, refreshing, refresh, savedIds, toggleSaved, sort, setSort, followedClubs, toggleFollow, mapStyle, setMapStyle, remindersOn, setRemindersOn, mySports, setMySports, needsSportsChoice, myAge, setMyAge, myGender, setMyGender, baseline, myCounty, setMyCounty, choosePlace, needsCounty, viewNote, dismissViewNote, showAllIreland, viewKey, syncedData, syncedLoaded, applySyncedData]
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
