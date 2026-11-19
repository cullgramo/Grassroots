import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useApp } from '@/context/AppContext';
import { dayKey } from '@/utils/date';
import { calendarChoice, selectedWhen, whenPatch } from '@/utils/days';
import { CalendarPanel } from './CalendarPanel';
import { useTheme } from './useTheme';

/**
 * The date control, in one slim bar: today, this weekend, the next 7 days, and a calendar for any other date. When
 * the choice came from the calendar, the calendar end of the bar says it ("28 Nov"), so what is on always shows.
 */
export function WhenChips({ elevated }: { elevated?: boolean }) {
  const t = useTheme();
  const { filters, setFilters } = useApp();
  const [calendar, setCalendar] = useState(false);

  const now = new Date();
  const on = selectedWhen(filters, now);
  const picked = calendarChoice(filters, now);
  // A date from the calendar takes room at the end of the bar, so the three choices then use their short names.
  const choices = [
    { key: dayKey(now), label: 'Today', short: 'Today' },
    { key: 'weekend', label: 'This weekend', short: 'Weekend' },
    { key: 'week', label: 'Next 7 days', short: '7 days' },
  ];

  return (
    <View style={[styles.bar, { backgroundColor: t.card }, elevated ? styles.elevated : { borderWidth: 1, borderColor: t.border }]}>
      {choices.map((c) => {
        const isOn = c.key === on;
        return (
          <Pressable
            key={c.key}
            onPress={() => setFilters(whenPatch(c.key, now))}
            accessibilityRole="button"
            accessibilityState={{ selected: isOn }}
            accessibilityLabel={c.label}
            hitSlop={{ top: 6, bottom: 6 }}
            style={[styles.choice, isOn && { backgroundColor: t.tint }]}>
            <Text style={[styles.label, { color: isOn ? t.onTint : t.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {picked ? c.short : c.label}
            </Text>
          </Pressable>
        );
      })}
      <View style={[styles.divider, { backgroundColor: t.border }]} />
      <Pressable
        onPress={() => setCalendar(true)}
        accessibilityRole="button"
        accessibilityState={{ selected: picked != null }}
        accessibilityLabel={picked ? `${picked}. Pick another date on the calendar` : 'Pick a date on the calendar'}
        hitSlop={{ top: 6, bottom: 6 }}
        style={[styles.calendar, picked != null && { backgroundColor: t.tint, paddingHorizontal: 10 }]}>
        <SymbolView name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }} tintColor={picked ? t.onTint : t.text} size={19} />
        {picked ? <Text style={[styles.label, { color: t.onTint }]} numberOfLines={1}>{picked}</Text> : null}
      </Pressable>
      <CalendarPanel visible={calendar} onClose={() => setCalendar(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', height: 42, borderRadius: 21, padding: 4, gap: 2 },
  elevated: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  // Each choice is as wide as its words, they share what is left over, and give way together on a narrow phone.
  choice: { flexGrow: 1, flexShrink: 1, flexBasis: 'auto', minWidth: 0, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  label: { fontSize: 13.5, fontWeight: '700' },
  divider: { width: 1, height: 20, marginHorizontal: 2 },
  calendar: { flexShrink: 0, minWidth: 40, height: 34, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
});
