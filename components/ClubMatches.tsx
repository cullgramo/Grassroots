import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ClubRow } from '@/components/ClubRow';
import { useTheme } from '@/components/useTheme';
import { useApp } from '@/context/AppContext';
import { findClubs } from '@/utils/club';

/** Above search results: the clubs whose name was typed, each with a Follow button. Nothing when no club matches. */
export function ClubMatches({ query }: { query: string }) {
  const t = useTheme();
  const { upcoming } = useApp();
  const clubs = useMemo(() => findClubs(upcoming, query, 3), [upcoming, query]);
  if (clubs.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <Text style={[styles.heading, { color: t.muted }]}>CLUBS</Text>
      {clubs.map((club) => (
        <View key={club.id} style={styles.item}>
          <ClubRow club={club} detail={club.games === 1 ? '1 upcoming game' : `${club.games} upcoming games`} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  heading: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8 },
  item: { marginBottom: 8 },
});
