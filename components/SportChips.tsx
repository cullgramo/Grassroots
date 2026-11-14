import { ScrollView, StyleSheet, View } from 'react-native';

import { GROUPS, sportsInGroup } from '@/constants/sports';
import { useApp } from '@/context/AppContext';
import { Chip } from './Chip';

/** Group chips, with a second row for the codes inside a multi-sport group such as GAA. */
export function SportChips({ elevated }: { elevated?: boolean }) {
  const { filters, setFilters, mySports } = useApp();
  const inGroup = filters.group ? sportsInGroup(filters.group) : [];

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.row}>
        <Chip
          compact
          label={mySports.length > 0 && !filters.allSports ? 'My sports' : 'All sports'}
          selected={!filters.group}
          elevated={elevated}
          // One chip for both modes: tap it to flip between the sports you follow and every sport.
          onPress={() => setFilters({ group: null, sport: null, allSports: filters.group || mySports.length === 0 ? filters.allSports : !filters.allSports })}
        />
        {GROUPS.map((g) => (
          <Chip
            compact
            key={g.id}
            label={g.label}
            dotColor={g.color ?? undefined}
            selected={filters.group === g.id}
            elevated={elevated}
            onPress={() => setFilters({ group: filters.group === g.id ? null : g.id, sport: null })}
          />
        ))}
      </ScrollView>
      {inGroup.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={[styles.row, styles.sub]}>
          {inGroup.map((s) => (
            <Chip
              compact
              key={s.id}
              label={s.name}
              dotColor={s.color}
              selected={filters.sport === s.id}
              elevated={elevated}
              onPress={() => setFilters({ sport: filters.sport === s.id ? null : s.id })}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { gap: 8, paddingHorizontal: 16, paddingVertical: 6 },
  sub: { paddingTop: 0 },
});
