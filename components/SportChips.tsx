import { ScrollView, StyleSheet } from 'react-native';

import { SPORTS, SPORT_COLORS, SPORT_SHORT } from '@/constants/sports';
import { useApp } from '@/context/AppContext';
import { activeFilterCount } from '@/utils/filterFixtures';
import { router } from 'expo-router';
import { Chip } from './Chip';

export function SportChips({ elevated }: { elevated?: boolean }) {
  const { filters, setFilters } = useApp();
  const count = activeFilterCount(filters);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Chip
        label={count ? `Filters (${count})` : 'Filters'}
        selected={count > 0}
        elevated={elevated}
        onPress={() => router.push('/filters')}
      />
      <Chip label="All" selected={!filters.sport} elevated={elevated} onPress={() => setFilters({ sport: null })} />
      {SPORTS.map((s) => (
        <Chip
          key={s}
          label={SPORT_SHORT[s]}
          dotColor={SPORT_COLORS[s]}
          selected={filters.sport === s}
          elevated={elevated}
          onPress={() => setFilters({ sport: filters.sport === s ? null : s })}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
});
