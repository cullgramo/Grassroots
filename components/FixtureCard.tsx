import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SPORT_COLORS } from '@/constants/sports';
import { useApp } from '@/context/AppContext';
import type { Fixture } from '@/types/fixture';
import { dayLabel, timeLabel } from '@/utils/date';
import { formatDistance } from '@/utils/distance';
import { distanceTo } from '@/utils/filterFixtures';
import { useTheme } from './useTheme';

interface Props {
  fixture: Fixture;
  onPress: () => void;
  selected?: boolean;
  elevated?: boolean;
}

export function FixtureCard({ fixture, onPress, selected, elevated }: Props) {
  const t = useTheme();
  const { location } = useApp();
  const km = distanceTo(fixture, location);
  const color = SPORT_COLORS[fixture.sport];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${fixture.homeTeam} versus ${fixture.awayTeam}, ${fixture.sport}`}
      style={[
        styles.card,
        { backgroundColor: t.card, borderColor: selected ? color : t.border },
        elevated && styles.elevated,
      ]}>
      <View style={[styles.stripe, { backgroundColor: color }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={[styles.sport, { color }]}>{fixture.sport.toUpperCase()}</Text>
          <Text style={[styles.when, { color: t.text }]}>
            {dayLabel(fixture.startsAt)} · {timeLabel(fixture.startsAt)}
          </Text>
        </View>
        <Text style={[styles.teams, { color: t.text }]} numberOfLines={1}>
          {fixture.homeTeam} v {fixture.awayTeam}
        </Text>
        <Text style={[styles.meta, { color: t.muted }]} numberOfLines={1}>
          {fixture.competition}
        </Text>
        <View style={styles.bottomRow}>
          <Text style={[styles.meta, styles.venue, { color: t.muted }]} numberOfLines={1}>
            {fixture.venue}, {fixture.county}
          </Text>
          {km != null ? <Text style={[styles.distance, { color: t.tint }]}>{formatDistance(km)}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', borderRadius: 16, borderWidth: 1.5, overflow: 'hidden' },
  elevated: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  stripe: { width: 6 },
  body: { flex: 1, padding: 14, gap: 4 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sport: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  when: { fontSize: 13, fontWeight: '700' },
  teams: { fontSize: 18, fontWeight: '800' },
  meta: { fontSize: 13 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  venue: { flex: 1 },
  distance: { fontSize: 13, fontWeight: '700' },
});
