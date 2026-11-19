import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GROUPS, getSport, sportsInGroup, type SportId } from '@/constants/sports';
import { useApp } from '@/context/AppContext';
import type { Filters } from '@/types/fixture';
import { sportCounts } from '@/utils/view';
import { BottomPanel } from './BottomPanel';
import { useTheme } from './useTheme';

interface RowProps {
  label: string;
  detail?: string;
  count: number;
  color?: string | null;
  selected: boolean;
  indent?: boolean;
  onPress: () => void;
}

function Row({ label, detail, count, color, selected, indent, onPress }: RowProps) {
  const t = useTheme();
  const none = count === 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}, ${count === 1 ? '1 fixture' : `${count} fixtures`}`}
      style={[styles.row, indent && styles.indent, { backgroundColor: selected ? t.card : 'transparent', borderColor: selected ? t.tint : 'transparent' }]}>
      <View style={[styles.dot, { backgroundColor: color ?? t.tint, opacity: none ? 0.35 : 1 }]} />
      <View style={styles.text}>
        <Text style={[styles.label, { color: none ? t.muted : t.text }]} numberOfLines={1}>{label}</Text>
        {detail ? <Text style={[styles.detail, { color: t.muted }]} numberOfLines={1}>{detail}</Text> : null}
      </View>
      <Text style={[styles.count, { color: none ? t.tabIconDefault : t.muted }]}>{count}</Text>
      {selected ? <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} tintColor={t.tint} size={20} /> : <View style={styles.tick} />}
    </Pressable>
  );
}

/**
 * Choose what to see: the sports you follow, every sport, or one. The number beside each is how many fixtures it has
 * in the place and dates showing now, so a choice that would empty the map is plain before it is made.
 */
export function SportPanel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const { filters, setFilters, allFixtures, location, mySports } = useApp();
  const counts = useMemo(
    () => (visible ? sportCounts(allFixtures, filters, location) : new Map<SportId, number>()),
    [visible, allFixtures, filters, location]
  );
  const of = (ids: readonly SportId[]) => ids.reduce((n, id) => n + (counts.get(id) ?? 0), 0);
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const pick = (patch: Partial<Filters>) => {
    setFilters(patch);
    onClose();
  };
  // Sports with fixtures in this view come first, in their usual order; the empty ones follow.
  const has = (id: string) => of(sportsInGroup(id).map((s) => s.id)) > 0;
  const groups = [...GROUPS.filter((g) => has(g.id)), ...GROUPS.filter((g) => !has(g.id))];
  const noPick = !filters.group && !filters.sport;
  const mine = mySports.length > 0;

  return (
    <BottomPanel visible={visible} title="Which sport?" onClose={onClose}>
      {mine ? (
        <Row
          label="My sports"
          detail={mySports.map((id) => getSport(id).name).join(', ')}
          count={of(mySports)}
          selected={noPick && !filters.allSports}
          onPress={() => pick({ group: null, sport: null, allSports: false })}
        />
      ) : null}
      <Row label="All sports" count={total} selected={noPick && (!mine || !!filters.allSports)} onPress={() => pick({ group: null, sport: null, allSports: true })} />

      <Text style={[styles.heading, { color: t.muted }]}>ONE SPORT</Text>
      {groups.map((g) => {
        const inside = sportsInGroup(g.id);
        const ids = inside.map((s) => s.id);
        return (
          <View key={g.id}>
            <Row
              label={inside.length > 1 ? `${g.label}, all codes` : g.label}
              count={of(ids)}
              color={g.color}
              selected={filters.group === g.id && !filters.sport}
              onPress={() => pick({ group: g.id, sport: null })}
            />
            {inside.length > 1
              ? inside.map((s) => (
                  <Row
                    key={s.id}
                    indent
                    label={s.name}
                    count={counts.get(s.id) ?? 0}
                    color={s.color}
                    selected={filters.sport === s.id}
                    onPress={() => pick({ group: g.id, sport: s.id })}
                  />
                ))
              : null}
          </View>
        );
      })}

      <Pressable
        onPress={() => {
          onClose();
          router.push('/sports');
        }}
        accessibilityRole="link"
        style={styles.link}>
        <Text style={[styles.linkText, { color: t.tint }]}>{mine ? 'Change my sports' : 'Choose the sports I follow'}</Text>
      </Pressable>
    </BottomPanel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, marginBottom: 2 },
  indent: { marginLeft: 22 },
  dot: { width: 11, height: 11, borderRadius: 6 },
  text: { flex: 1, minWidth: 0 },
  label: { fontSize: 16, fontWeight: '700' },
  detail: { fontSize: 12.5, marginTop: 1 },
  count: { fontSize: 14, fontWeight: '700', minWidth: 28, textAlign: 'right' },
  tick: { width: 20 },
  heading: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginTop: 14, marginBottom: 6, marginLeft: 12 },
  link: { minHeight: 48, justifyContent: 'center', marginLeft: 12, marginTop: 6 },
  linkText: { fontSize: 15, fontWeight: '800' },
});
