import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { getSport } from '@/constants/sports';
import { useApp } from '@/context/AppContext';
import { fixtureTitle, type Fixture } from '@/types/fixture';
import { hasStarted, shortDay, timeLabel } from '@/utils/date';
import { formatDistance } from '@/utils/distance';
import { distanceTo } from '@/utils/filterFixtures';
import { useColorScheme } from './useColorScheme';
import { useTheme } from './useTheme';

const GOLD = '#f59e0b';

/** The star that keeps a fixture in Favourites. */
export function SaveButton({ fixture, size = 24 }: { fixture: Fixture; size?: number }) {
  const t = useTheme();
  const { savedIds, toggleSaved } = useApp();
  const saved = savedIds.includes(fixture.id);
  return (
    <Pressable
      onPress={() => toggleSaved(fixture.id)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityState={{ selected: saved }}
      accessibilityLabel={`${saved ? 'Remove' : 'Save'} ${fixtureTitle(fixture)}`}
      style={styles.star}>
      {saved && Platform.OS !== 'ios' ? (
        // The symbol font used on Android and web only has an outline star, so the filled one is the plain character.
        <Text style={{ fontSize: size, lineHeight: size + 2, width: size + 2, textAlign: 'center', color: GOLD }}>{'★'}</Text>
      ) : (
        <SymbolView
          name={saved ? { ios: 'star.fill' } : { ios: 'star', android: 'star', web: 'star' }}
          tintColor={saved ? GOLD : t.tabIconDefault}
          size={size}
        />
      )}
    </Pressable>
  );
}

interface Props {
  fixture: Fixture;
  onPress: () => void;
  /** Says the day above the time: for lists that are not already under a heading for one day. */
  showDay?: boolean;
  /** Floating over the map, with a shadow. */
  elevated?: boolean;
}

/**
 * One fixture in a list, slim enough that four or five fit where two large cards did: the time and sport on the
 * left, the two sides one above the other, the ground and competition beneath, then how far away it is and the star.
 * Anything that changes whether to go (off, time not set, ground not confirmed) is always said in words.
 */
export function FixtureRow({ fixture, onPress, showDay, elevated }: Props) {
  const t = useTheme();
  const dark = useColorScheme() === 'dark';
  const { location } = useApp();
  const km = distanceTo(fixture, location);
  const sport = getSport(fixture.sport);
  const off = fixture.status === 'cancelled' ? 'Cancelled' : fixture.status === 'postponed' ? 'Postponed' : null;
  const started = !off && hasStarted(fixture);
  const time = fixture.timeTbc ? 'TBC' : timeLabel(fixture.startsAt);
  const day = shortDay(fixture.startsAt);
  const event = !fixture.homeTeam || !fixture.awayTeam;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      // Everything a sighted user reads on the row, in one sentence for a screen reader.
      accessibilityLabel={[
        off,
        fixtureTitle(fixture),
        sport.name,
        `${showDay ? `${day.toLowerCase()} ` : ''}${fixture.timeTbc ? 'time to be confirmed' : time}`,
        started ? 'started' : null,
        `${fixture.venue}${fixture.venueUnconfirmed ? ', venue not confirmed' : ''}`,
        fixture.competition || null,
        km != null ? `${formatDistance(km)} away` : null,
        fixture.ticketed ? 'ticketed' : null,
      ].filter(Boolean).join(', ')}
      style={[styles.row, { backgroundColor: t.card, borderColor: t.border }, elevated && styles.elevated]}>
      <View style={[styles.bar, { backgroundColor: sport.color }]} />
      <View style={styles.when}>
        {showDay ? <Text style={[styles.day, { color: t.muted }]} numberOfLines={1}>{day}</Text> : null}
        <Text style={[styles.time, { color: off ? t.muted : t.text }, off && styles.struck]} numberOfLines={1}>{time}</Text>
        {/* The sport's own colour on a light row; on a dark one some (navy, maroon) would not show, so plain grey. */}
        <Text style={[styles.sport, { color: dark ? t.muted : sport.color }]} numberOfLines={1}>{sport.name}</Text>
      </View>
      <View style={[styles.rule, { backgroundColor: t.border }]} />
      <View style={styles.body}>
        {event ? (
          <Text style={[styles.side, { color: t.text }]} numberOfLines={2}>{fixtureTitle(fixture)}</Text>
        ) : (
          <>
            <Text style={[styles.side, { color: t.text }]} numberOfLines={1}>{fixture.homeTeam}</Text>
            <Text style={[styles.side, { color: t.text }]} numberOfLines={1}>{fixture.awayTeam}</Text>
          </>
        )}
        <Text style={[styles.meta, { color: t.muted }]} numberOfLines={1}>
          {off ? <Text style={styles.off}>{off} · </Text> : started ? <Text style={styles.started}>Started · </Text> : null}
          {[fixture.venue, fixture.competition].filter(Boolean).join(' · ')}
        </Text>
        {/* On its own line, so a long ground name can never push it out of sight. */}
        {fixture.venueUnconfirmed ? <Text style={[styles.meta, styles.unconfirmed]} numberOfLines={1}>Venue not confirmed</Text> : null}
      </View>
      <View style={styles.end}>
        {km != null ? <Text style={[styles.km, { color: t.tint }]}>{formatDistance(km)}</Text> : null}
        {fixture.ticketed && km == null ? <Text style={[styles.km, { color: t.muted }]}>Tickets</Text> : null}
        <SaveButton fixture={fixture} size={23} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 64, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  elevated: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  bar: { width: 4, alignSelf: 'stretch' },
  when: { width: 60, alignItems: 'center', paddingVertical: 8, gap: 1 },
  day: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4 },
  time: { fontSize: 15.5, fontWeight: '800' },
  struck: { textDecorationLine: 'line-through' },
  sport: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase', maxWidth: 56 },
  rule: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 9 },
  body: { flex: 1, minWidth: 0, paddingVertical: 8, paddingLeft: 10 },
  side: { fontSize: 14.5, fontWeight: '700', lineHeight: 18 },
  meta: { fontSize: 12, lineHeight: 16, marginTop: 1 },
  off: { color: '#b91c1c', fontWeight: '800' },
  started: { color: '#b45309', fontWeight: '800' },
  unconfirmed: { color: '#b45309', fontWeight: '700' },
  end: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 6, paddingRight: 2 },
  km: { fontSize: 12.5, fontWeight: '800' },
  star: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
});
