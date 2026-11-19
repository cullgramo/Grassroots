import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useApp } from '@/context/AppContext';
import { dayKey, startOfDay } from '@/utils/date';
import { dayCounts, MONTH_NAMES, monthGrid, selectedWhen, whenPatch } from '@/utils/days';
import { BottomPanel } from './BottomPanel';
import { Chip } from './Chip';
import { useTheme } from './useTheme';

const HEAD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// How far ahead the calendar goes. Fixtures are rarely published further out than this.
const MONTHS_AHEAD = 11;

/**
 * Pick any date. Days that have fixtures in the current place and sports carry a dot, so nobody has to tap through
 * empty days to find the next game. Days already gone cannot be picked.
 */
export function CalendarPanel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <BottomPanel visible={visible} title="Pick a date" onClose={onClose}>
      {/* Mounted only while open, so it always opens on the month of the date that is on. */}
      {visible ? <Month onClose={onClose} /> : null}
    </BottomPanel>
  );
}

function Month({ onClose }: { onClose: () => void }) {
  const t = useTheme();
  const { filters, setFilters, allFixtures, location, mySports } = useApp();
  const today = startOfDay(new Date());
  const todayKey = dayKey(today);
  const on = selectedWhen(filters, today);
  const start = /^\d{4}-\d{2}-\d{2}$/.test(on) ? new Date(+on.slice(0, 4), +on.slice(5, 7) - 1, 1) : new Date(today.getFullYear(), today.getMonth(), 1);
  const [shown, setShown] = useState({ year: start.getFullYear(), month: start.getMonth() });
  const counts = useMemo(() => dayCounts(allFixtures, filters, location, mySports), [allFixtures, filters, location, mySports]);
  const grid = useMemo(() => monthGrid(shown.year, shown.month), [shown]);

  const offset = (shown.year - today.getFullYear()) * 12 + shown.month - today.getMonth();
  const move = (by: number) => {
    const d = new Date(shown.year, shown.month + by, 1);
    setShown({ year: d.getFullYear(), month: d.getMonth() });
  };
  const choose = (key: string) => {
    setFilters(whenPatch(key, today));
    onClose();
  };

  return (
    <View>
      <View style={styles.monthRow}>
        <Text style={[styles.month, { color: t.text }]} accessibilityRole="header">
          {MONTH_NAMES[shown.month]} {shown.year}
        </Text>
        <Pressable
          onPress={() => move(-1)}
          disabled={offset <= 0}
          accessibilityRole="button"
          accessibilityLabel="Earlier month"
          hitSlop={8}
          style={[styles.arrow, { borderColor: t.border, opacity: offset <= 0 ? 0.35 : 1 }]}>
          <SymbolView name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }} tintColor={t.text} size={22} />
        </Pressable>
        <Pressable
          onPress={() => move(1)}
          disabled={offset >= MONTHS_AHEAD}
          accessibilityRole="button"
          accessibilityLabel="Later month"
          hitSlop={8}
          style={[styles.arrow, { borderColor: t.border, opacity: offset >= MONTHS_AHEAD ? 0.35 : 1 }]}>
          <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} tintColor={t.text} size={22} />
        </Pressable>
      </View>

      <View style={styles.week}>
        {HEAD.map((h) => (
          <Text key={h} style={[styles.head, { color: t.muted }]}>{h.toUpperCase()}</Text>
        ))}
      </View>
      {grid.map((week, i) => (
        <View key={i} style={styles.week}>
          {week.map((d, j) => {
            if (!d) return <View key={j} style={styles.cell} />;
            const key = dayKey(d);
            const past = d.getTime() < today.getTime();
            const isOn = key === on;
            const isToday = key === todayKey;
            const n = counts.get(key) ?? 0;
            return (
              <Pressable
                key={j}
                onPress={() => choose(key)}
                disabled={past}
                accessibilityRole="button"
                accessibilityState={{ selected: isOn, disabled: past }}
                accessibilityLabel={`${d.getDate()} ${MONTH_NAMES[d.getMonth()]}${isToday ? ', today' : ''}, ${n === 1 ? '1 fixture' : `${n} fixtures`}`}
                style={styles.cell}>
                <View style={[styles.day, isOn && { backgroundColor: t.tint }, !isOn && isToday && { borderWidth: 2, borderColor: t.tint }]}>
                  <Text style={[styles.dayText, { color: isOn ? t.onTint : past ? t.border : n > 0 ? t.text : t.muted }]}>{d.getDate()}</Text>
                  {n > 0 && !past ? <View style={[styles.dot, { backgroundColor: isOn ? t.onTint : t.tint }]} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      <View style={styles.legend}>
        <View style={[styles.dot, styles.legendDot, { backgroundColor: t.tint }]} />
        <Text style={[styles.legendText, { color: t.muted }]}>Days with fixtures in this view</Text>
      </View>

      <View style={styles.quick}>
        <Chip label="Today" selected={on === todayKey} onPress={() => choose(todayKey)} />
        <Chip label="This weekend" selected={on === 'weekend'} onPress={() => choose('weekend')} />
        <Chip label="Next 7 days" selected={on === 'week'} onPress={() => choose('week')} />
        <Chip label="All dates" selected={on === 'any'} onPress={() => choose('any')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, marginTop: 4 },
  month: { flex: 1, fontSize: 18, fontWeight: '800' },
  arrow: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' },
  head: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, paddingVertical: 6 },
  cell: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center' },
  day: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 16, fontWeight: '700' },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  legendDot: { marginTop: 0 },
  legendText: { fontSize: 12.5 },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, marginBottom: 6 },
});
