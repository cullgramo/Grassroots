import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SPORT_COLORS } from '@/constants/sports';
import { useApp } from '@/context/AppContext';
import type { Fixture } from '@/types/fixture';
import { dayLabel, timeLabel, urgencyLabel } from '@/utils/date';
import { formatDistance } from '@/utils/distance';
import { distanceTo } from '@/utils/filterFixtures';
import { useTheme } from './useTheme';

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
      accessibilityLabel={`${saved ? 'Remove' : 'Save'} ${fixture.homeTeam} v ${fixture.awayTeam}`}
      style={styles.heart}>
      <Text style={{ fontSize: size, lineHeight: size + 4, color: saved ? '#e11d48' : t.muted }}>
        {saved ? '♥' : '♡'}
      </Text>
    </Pressable>
  );
}

interface Props {
  fixture: Fixture;
  onPress: () => void;
  elevated?: boolean;
}

export function FixtureCard({ fixture, onPress, elevated }: Props) {
  const t = useTheme();
  const { location } = useApp();
  const km = distanceTo(fixture, location);
  const color = SPORT_COLORS[fixture.sport];
  const urgency = urgencyLabel(fixture.startsAt);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${fixture.homeTeam} versus ${fixture.awayTeam}, ${fixture.sport}`}
      style={[styles.card, { backgroundColor: t.card, borderColor: t.border }, elevated && styles.elevated]}>
      <View style={[styles.time, { backgroundColor: color }]}>
        <Text style={styles.timeDay}>{dayLabel(fixture.startsAt).split(',')[0].toUpperCase()}</Text>
        <Text style={styles.timeClock}>{timeLabel(fixture.startsAt)}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={[styles.sport, { color }]} numberOfLines={1}>
            {fixture.sport.toUpperCase()}
          </Text>
          {urgency ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{urgency}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.teams, { color: t.text }]} numberOfLines={2}>
          {fixture.homeTeam} v {fixture.awayTeam}
        </Text>
        <Text style={[styles.meta, { color: t.muted }]} numberOfLines={1}>
          {fixture.competition}
        </Text>
        <Text style={[styles.meta, { color: t.muted }]} numberOfLines={1}>
          {fixture.venue}
          {km != null ? <Text style={[styles.strong, { color: t.tint }]}> · {formatDistance(km)}</Text> : null}
          {fixture.ticketed ? ' · Ticketed' : ''}
        </Text>
      </View>
      <SaveButton fixture={fixture} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  elevated: {
    borderWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  time: { width: 74, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  timeDay: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  timeClock: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 2 },
  body: { flex: 1, paddingVertical: 12, paddingLeft: 12, gap: 3 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sport: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  badge: { backgroundColor: '#fef3c7', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { color: '#92400e', fontSize: 11, fontWeight: '800' },
  teams: { fontSize: 17, fontWeight: '800' },
  meta: { fontSize: 13 },
  strong: { fontWeight: '700' },
  heart: { width: 48, alignItems: 'center', paddingTop: 10 },
});
