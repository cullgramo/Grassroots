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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Chip
          label="All"
          selected={!filters.group && (mySports.length === 0 || Boolean(filters.allSports))}
          elevated={elevated}
          onPress={() => setFilters({ group: null, sport: null, allSports: true })}
        />
        {mySports.length > 0 ? (
          <Chip
            label="My sports"
            selected={!filters.group && !filters.allSports}
            elevated={elevated}
            onPress={() => setFilters({ group: null, sport: null, allSports: false })}
          />
        ) : null}
        {GROUPS.map((g) => (
          <Chip
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.row, styles.sub]}>
          {inGroup.map((s) => (
            <Chip
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
  row: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  sub: { paddingTop: 0 },
});
