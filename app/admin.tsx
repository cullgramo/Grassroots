import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { FixtureCard } from '@/components/FixtureCard';
import { FixtureMap } from '@/components/FixtureMap';
import { useTheme } from '@/components/useTheme';
import { SPORTS, type SportId } from '@/constants/sports';
import { useApp } from '@/context/AppContext';
import { backendConfigured } from '@/lib/fixtures';
import { fetchVenues, findVenue, matchVenue, saveFixtures, searchPlace, type Venue } from '@/lib/venues';
import type { Fixture, Level } from '@/types/fixture';
import { parseFixtures, type ParsedFixture } from '@/utils/parseFixtures';

type Found = { state: 'looking' } | { state: 'missing' } | { state: 'known' | 'found'; venue: Venue };

const EXAMPLE = 'Sat 14 Nov\n12:30 Ballinacor v St Annes, Echelon Park\n14:00 Naomh Olaf v Ballon, Parnell Park';

function toFixture(p: ParsedFixture, venue: Venue, index: number): Fixture {
  return {
    id: `new-${index}`, sport: p.sport, level: p.level, competition: p.competition, homeTeam: p.homeTeam, awayTeam: p.awayTeam,
    title: p.title, venue: venue.name, county: venue.county, latitude: venue.latitude, longitude: venue.longitude,
    startsAt: p.startsAt!, ticketed: !!p.ticketUrl, ticketUrl: p.ticketUrl,
  };
}

export default function AdminScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { refresh } = useApp();
  const [text, setText] = useState('');
  const [sport, setSport] = useState<SportId>('gaelic-football');
  const [level, setLevel] = useState<Level>('Local');
  const [known, setKnown] = useState<Venue[]>([]);
  const [found, setFound] = useState<Record<string, Found>>({});
  const [searches, setSearches] = useState<Record<string, string>>({});
  const [openMap, setOpenMap] = useState<string | null>(null);
  const [phrase, setPhrase] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const started = useRef(new Set<string>());

  useEffect(() => {
    if (backendConfigured) fetchVenues().then(setKnown).catch(() => {});
  }, []);

  const parsed = useMemo(() => parseFixtures(text, { defaultSport: sport, level }), [text, sport, level]);
  const venueNames = useMemo(() => [...new Set(parsed.map((p) => p.venueName).filter(Boolean))], [parsed]);

  // Work out where each ground is: our own list first, then a place search, one at a time.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const name of venueNames) {
        if (started.current.has(name)) continue;
        started.current.add(name);
        const match = matchVenue(name, known);
        if (match) {
          setFound((f) => ({ ...f, [name]: { state: 'known', venue: match } }));
          continue;
        }
        setFound((f) => ({ ...f, [name]: { state: 'looking' } }));
        const hit = await findVenue(name);
        if (cancelled) return;
        setFound((f) => ({ ...f, [name]: hit ? { state: 'found', venue: hit } : { state: 'missing' } }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [venueNames, known]);

  const searchAgain = async (name: string) => {
    const query = (searches[name] ?? '').trim();
    if (!query) return;
    setFound((f) => ({ ...f, [name]: { state: 'looking' } }));
    const hit = await searchPlace(query, name).catch(() => null);
    setFound((f) => ({ ...f, [name]: hit ? { state: 'found', venue: hit } : { state: 'missing' } }));
    if (hit) setOpenMap(name);
  };

  const ready: { fixture: Fixture; parsed: ParsedFixture; venue: Venue }[] = [];
  const notReady: { parsed: ParsedFixture; why: string[] }[] = [];
  parsed.forEach((p, i) => {
    const place = found[p.venueName];
    const venue = place && (place.state === 'known' || place.state === 'found') ? place.venue : null;
    const why = [...p.problems];
    if (p.venueName && !venue) why.push(place?.state === 'looking' ? 'Finding the ground…' : 'Ground not found');
    if (why.length === 0 && venue) ready.push({ fixture: toFixture(p, venue, i), parsed: p, venue });
    else notReady.push({ parsed: p, why });
  });

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const { saved } = await saveFixtures(
        phrase,
        ready.map(({ parsed: p, venue }) => ({
          sport_id: p.sport, level: p.level === 'Top level' ? 'top' : 'local', competition: p.competition,
          home_team: p.homeTeam ?? null, away_team: p.awayTeam ?? null, title: p.title ?? null,
          starts_at: p.startsAt, ticket_url: p.ticketUrl ?? null, venue,
        }))
      );
      setMessage({ ok: true, text: `Saved ${saved} ${saved === 1 ? 'fixture' : 'fixtures'}.` });
      setText('');
      refresh();
    } catch (e) {
      setMessage({ ok: false, text: String((e as Error).message) });
    } finally {
      setSaving(false);
    }
  };

  if (!backendConfigured) {
    return (
      <View style={[styles.screen, styles.centre, { backgroundColor: t.background }]}>
        <Text style={[styles.note, { color: t.text }]}>Connect the app to your database first.</Text>
      </View>
    );
  }

  const input = [styles.input, { color: t.text, backgroundColor: t.card, borderColor: t.border }];
  const canSave = ready.length > 0 && phrase.trim().length > 0 && !saving;

  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.heading, { color: t.text }]}>1. Paste your list</Text>
        <TextInput
          value={text}
          onChangeText={(v) => {
            setText(v);
            setMessage(null);
          }}
          multiline
          placeholder={EXAMPLE}
          placeholderTextColor={t.muted}
          accessibilityLabel="Fixture list"
          autoCapitalize="none"
          autoCorrect={false}
          style={[...input, styles.paste]}
        />

        <Text style={[styles.heading, { color: t.text }]}>2. If a line does not say</Text>
        <View style={styles.chips}>
          {SPORTS.map((s) => (
            <Chip key={s.id} label={s.name} dotColor={s.color} selected={sport === s.id} onPress={() => setSport(s.id)} />
          ))}
        </View>
        <View style={[styles.chips, styles.gap]}>
          {(['Local', 'Top level'] as Level[]).map((l) => (
            <Chip key={l} label={l} selected={level === l} onPress={() => setLevel(l)} />
          ))}
        </View>

        {venueNames.length > 0 ? <Text style={[styles.heading, { color: t.text }]}>3. Check the grounds</Text> : null}
        {venueNames.map((name) => {
          const place = found[name];
          const venue = place && (place.state === 'known' || place.state === 'found') ? place.venue : null;
          const status =
            !place || place.state === 'looking' ? 'Looking…'
            : place.state === 'known' ? `Already in your list · ${place.venue.county}`
            : place.state === 'found' ? `Found in ${place.venue.county}. Check the map.`
            : 'Not found. Search for the town or club below.';
          return (
            <View key={name} style={[styles.ground, { backgroundColor: t.card, borderColor: place?.state === 'missing' ? '#dc2626' : t.border }]}>
              <Text style={[styles.groundName, { color: t.text }]}>{name}</Text>
              <Text style={[styles.note, { color: place?.state === 'missing' ? '#dc2626' : t.muted }]}>{status}</Text>
              {venue ? (
                <Pressable onPress={() => setOpenMap(openMap === name ? null : name)} accessibilityRole="button" style={styles.link}>
                  <Text style={[styles.linkText, { color: t.tint }]}>{openMap === name ? 'Hide map' : 'Show on map'}</Text>
                </Pressable>
              ) : null}
              {venue && openMap === name ? (
                <View style={styles.map}>
                  <FixtureMap
                    key={`${venue.latitude},${venue.longitude}`}
                    fixtures={[{ id: 'place', sport, level, competition: '', title: name, venue: name, county: venue.county, latitude: venue.latitude, longitude: venue.longitude, startsAt: new Date().toISOString(), ticketed: false }]}
                    selectedId="place"
                    userLocation={null}
                    interactive={false}
                  />
                </View>
              ) : null}
              {place && place.state !== 'known' && place.state !== 'looking' ? (
                <View style={styles.searchRow}>
                  <TextInput
                    value={searches[name] ?? ''}
                    onChangeText={(v) => setSearches((s) => ({ ...s, [name]: v }))}
                    placeholder="Town or club, e.g. Aughrim, Wicklow"
                    placeholderTextColor={t.muted}
                    accessibilityLabel={`Search for ${name}`}
                    onSubmitEditing={() => searchAgain(name)}
                    style={[...input, styles.search]}
                  />
                  <Chip label="Search" onPress={() => searchAgain(name)} />
                </View>
              ) : null}
            </View>
          );
        })}

        {parsed.length > 0 ? (
          <Text style={[styles.heading, { color: t.text }]}>
            {venueNames.length > 0 ? '4' : '3'}. Check the fixtures ({ready.length} ready{notReady.length ? `, ${notReady.length} not` : ''})
          </Text>
        ) : text.trim() ? (
          <Text style={[styles.note, styles.gap, { color: t.muted }]}>
            No fixtures found yet. Put one game on each line, like “12:30 Team A v Team B, Ground”, under a date line.
          </Text>
        ) : null}
        {notReady.map(({ parsed: p, why }, i) => (
          <View key={`bad-${i}`} style={[styles.bad, { borderColor: '#dc2626', backgroundColor: t.card }]}>
            <Text style={[styles.badTitle, { color: t.text }]}>{p.title ?? `${p.homeTeam ?? '?'} v ${p.awayTeam ?? '?'}`}</Text>
            <Text style={styles.badWhy}>{why.join(' · ')}</Text>
            <Text style={[styles.raw, { color: t.muted }]} numberOfLines={2}>{p.raw}</Text>
          </View>
        ))}
        {ready.map(({ fixture }) => (
          <View key={fixture.id} style={styles.card} pointerEvents="none">
            <FixtureCard fixture={fixture} onPress={() => {}} />
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: t.card, borderColor: t.border, paddingBottom: insets.bottom + 12 }]}>
        {message ? <Text style={[styles.message, { color: message.ok ? t.tint : '#dc2626' }]}>{message.text}</Text> : null}
        <View style={styles.footerRow}>
          <TextInput
            value={phrase}
            onChangeText={setPhrase}
            placeholder="Admin phrase"
            placeholderTextColor={t.muted}
            accessibilityLabel="Admin phrase"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={[...input, styles.phrase]}
          />
          <Pressable
            onPress={save}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
            style={[styles.save, { backgroundColor: canSave ? t.tint : t.border }]}>
            <Text style={[styles.saveText, { color: canSave ? t.onTint : t.muted }]}>
              {saving ? 'Saving…' : `Save ${ready.length}`}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 17, fontWeight: '800', marginTop: 18, marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  paste: { minHeight: 150, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gap: { marginTop: 12 },
  note: { fontSize: 14 },
  ground: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10, gap: 4 },
  groundName: { fontSize: 15, fontWeight: '700' },
  link: { minHeight: 36, justifyContent: 'center', alignSelf: 'flex-start' },
  linkText: { fontSize: 14, fontWeight: '700' },
  map: { height: 180, borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 6 },
  search: { flex: 1 },
  bad: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10, gap: 3 },
  badTitle: { fontSize: 15, fontWeight: '700' },
  badWhy: { fontSize: 14, fontWeight: '700', color: '#dc2626' },
  raw: { fontSize: 12 },
  card: { marginBottom: 10 },
  footer: { borderTopWidth: 1, padding: 12, gap: 8 },
  footerRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  message: { fontSize: 14, fontWeight: '700' },
  phrase: { flex: 1, minHeight: 48 },
  save: { minHeight: 48, borderRadius: 24, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 16, fontWeight: '800' },
});
