import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useApp } from '@/context/AppContext';
import { addDays, dayKey } from '@/utils/date';
import { dayCounts, extraStripItem, selectedWhen, stripDays, weekendLabel, whenPatch, type StripItem } from '@/utils/days';
import { whenRange } from '@/utils/filterFixtures';
import { CalendarPanel } from './CalendarPanel';
import { useTheme } from './useTheme';

const DAY_W = 48;
const WIDE_W = 82;
const GAP = 2;

/**
 * The date control: this weekend, then each of the next fourteen days, one tap each, with a calendar for anything
 * further ahead. A day with no fixtures in the current place and sports is greyed, so empty days are not a surprise.
 */
export function DayStrip({ elevated }: { elevated?: boolean }) {
  const t = useTheme();
  const { filters, setFilters, allFixtures, location, mySports } = useApp();
  const [calendar, setCalendar] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  const now = new Date();
  const days = stripDays(now);
  const on = selectedWhen(filters, now);
  const extra = extraStripItem(filters, days, now);
  // Fixtures on each day in the current place and sports, and across the weekend the first choice means.
  const { counts, weekendCount } = useMemo(() => {
    const perDay = dayCounts(allFixtures, filters, location, mySports);
    const [from, to] = whenRange({ when: 'weekend' });
    let n = 0;
    for (let d = from; d && to && d.getTime() < to.getTime(); d = addDays(d, 1)) n += perDay.get(dayKey(d)) ?? 0;
    return { counts: perDay, weekendCount: n };
  }, [allFixtures, filters, location, mySports]);

  const items: (StripItem & { wide?: boolean; count: number | null })[] = [
    ...(extra ? [{ ...extra, count: null }] : []),
    { key: 'weekend', top: 'WEEKEND', bottom: weekendLabel(now), wide: true, count: weekendCount },
    ...days.map((d) => ({ ...d, count: counts.get(d.key) ?? 0 })),
  ];

  // Bring the choice into sight when it changes (a date picked on the calendar can be far along the strip).
  useEffect(() => {
    let x = 0;
    for (const item of items) {
      if (item.key === on) break;
      x += (item.wide ? WIDE_W : DAY_W) + GAP;
    }
    scroll.current?.scrollTo({ x: Math.max(0, x - WIDE_W), animated: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, extra?.key]);

  return (
    <View style={[styles.strip, { backgroundColor: t.card }, elevated ? styles.elevated : { borderWidth: 1, borderColor: t.border }]}>
      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.days}>
        {items.map((item) => {
          const isOn = item.key === on;
          const empty = item.count === 0;
          return (
            <Pressable
              key={item.key}
              onPress={() => setFilters(whenPatch(item.key))}
              accessibilityRole="button"
              accessibilityState={{ selected: isOn }}
              accessibilityLabel={`${item.top} ${item.bottom}${item.count == null ? '' : `, ${item.count === 1 ? '1 fixture' : `${item.count} fixtures`}`}`}
              style={[styles.day, { width: item.wide ? WIDE_W : DAY_W }, isOn && { backgroundColor: t.tint }]}>
              <Text style={[styles.top, { color: isOn ? t.onTint : item.top === 'TODAY' ? t.tint : t.muted }]} numberOfLines={1}>{item.top}</Text>
              <Text style={[styles.bottom, { color: isOn ? t.onTint : empty ? t.tabIconDefault : t.text }]} numberOfLines={1}>{item.bottom}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable
        onPress={() => setCalendar(true)}
        accessibilityRole="button"
        accessibilityLabel="Pick a date on the calendar"
        style={[styles.calendar, { borderColor: t.border, backgroundColor: t.card }]}>
        <SymbolView name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }} tintColor={t.text} size={22} />
      </Pressable>
      <CalendarPanel visible={calendar} onClose={() => setCalendar(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', height: 58, borderRadius: 18, paddingLeft: 5, paddingRight: 6, gap: 6 },
  elevated: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  scroll: { flex: 1 },
  days: { gap: GAP, alignItems: 'center' },
  day: { height: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', gap: 1 },
  top: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5 },
  bottom: { fontSize: 13.5, fontWeight: '800' },
  calendar: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
