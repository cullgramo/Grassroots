import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useApp } from '@/context/AppContext';
import { screenFilterCount, unlabelledCount } from '@/utils/filterFixtures';
import { placeChoice, sportChoice } from '@/utils/view';
import { DayStrip } from './DayStrip';
import { PlacePanel } from './PlacePanel';
import { SportPanel } from './SportPanel';
import { useTheme } from './useTheme';

interface Props {
  query: string;
  onChangeQuery: (q: string) => void;
  /** Over the map the controls float with a shadow; above the plain list they sit flat with a border. */
  elevated?: boolean;
}

/**
 * The two rows that decide what is showing: what (sport), where (place) and when (the day strip), with search and the
 * other filters at either end. Each control says its current choice, so nobody has to open a screen to see why a
 * fixture is or is not there.
 */
export function MapControls({ query, onChangeQuery, elevated }: Props) {
  const t = useTheme();
  const { filters, baseline, location, mySports, allFixtures, viewNote, dismissViewNote } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const [panel, setPanel] = useState<'sport' | 'place' | null>(null);

  const searching = searchOpen || query.length > 0;
  const sport = sportChoice(filters, mySports);
  const place = placeChoice(filters, location != null);
  const count = screenFilterCount(filters, baseline);
  const genderOn = (filters.gender ?? 'all') !== 'all';
  // Games with no stated category are left out of a men's or women's view; say how many, so nothing disappears quietly.
  const unlabelled = useMemo(
    () => (genderOn ? unlabelledCount(allFixtures, filters, location, new Date(), mySports) : 0),
    [genderOn, allFixtures, filters, location, mySports]
  );
  const lift = elevated ? styles.elevated : { borderWidth: 1, borderColor: t.border };
  const placeIcon =
    place === 'Near me'
      ? ({ ios: 'location.fill', android: 'near_me', web: 'near_me' } as const)
      : filters.county
        ? ({ ios: 'mappin', android: 'location_on', web: 'location_on' } as const)
        : ({ ios: 'globe', android: 'public', web: 'public' } as const);

  return (
    <View style={styles.wrap}>
      {searching ? (
        <View style={[styles.search, { backgroundColor: t.card }, lift]}>
          <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} tintColor={t.muted} size={20} />
          <TextInput
            value={query}
            onChangeText={onChangeQuery}
            placeholder="Search teams, grounds, competitions"
            placeholderTextColor={t.muted}
            accessibilityLabel="Search fixtures"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus
            style={[styles.input, { color: t.text }]}
          />
          <Pressable
            onPress={() => {
              onChangeQuery('');
              setSearchOpen(false);
            }}
            accessibilityRole="button"
            accessibilityLabel="Close search"
            hitSlop={10}
            style={styles.closeSearch}>
            <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} tintColor={t.text} size={20} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.row}>
          <Pressable
            onPress={() => setSearchOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Search teams, grounds and competitions"
            style={[styles.round, { backgroundColor: t.card }, lift]}>
            <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} tintColor={t.text} size={22} />
          </Pressable>
          <Pressable
            onPress={() => setPanel('sport')}
            accessibilityRole="button"
            accessibilityLabel={`Sport: ${sport.label}. Change`}
            style={[styles.pill, styles.sport, { backgroundColor: t.card }, lift]}>
            <View style={[styles.dot, { backgroundColor: sport.color ?? t.tint }]} />
            <Text style={[styles.label, { color: t.text }]} numberOfLines={1}>{sport.label}</Text>
            <SymbolView name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }} tintColor={t.muted} size={16} />
          </Pressable>
          <Pressable
            onPress={() => setPanel('place')}
            accessibilityRole="button"
            accessibilityLabel={`Place: ${place}. Change`}
            style={[styles.pill, styles.place, { backgroundColor: t.card }, lift]}>
            <SymbolView name={placeIcon} tintColor={t.tint} size={16} />
            <Text style={[styles.label, { color: t.text }]} numberOfLines={1}>{place}</Text>
            <SymbolView name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }} tintColor={t.muted} size={16} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/filters')}
            accessibilityRole="button"
            accessibilityLabel={count ? `Filters, ${count} on` : 'Filters'}
            style={[styles.round, { backgroundColor: count ? t.tint : t.card }, lift]}>
            <SymbolView name={{ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' }} tintColor={count ? t.onTint : t.text} size={22} />
            {count ? (
              <View style={[styles.badge, { backgroundColor: t.card, borderColor: t.tint }]}>
                <Text style={[styles.badgeText, { color: t.tint }]}>{count}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      )}

      <DayStrip elevated={elevated} />

      {genderOn && unlabelled > 0 ? (
        <View style={[styles.note, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[styles.noteText, { color: t.muted }]}>
            {unlabelled} {unlabelled === 1 ? 'fixture is' : 'fixtures are'} not labelled men or women, so only shown under All.
          </Text>
        </View>
      ) : null}
      {viewNote ? (
        <View style={[styles.note, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[styles.noteText, { color: t.text }]}>{viewNote}</Text>
          <Pressable onPress={dismissViewNote} accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={12}>
            <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} tintColor={t.muted} size={16} />
          </Pressable>
        </View>
      ) : null}

      <SportPanel visible={panel === 'sport'} onClose={() => setPanel(null)} />
      <PlacePanel visible={panel === 'place'} onClose={() => setPanel(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  elevated: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  round: { width: 42, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  // The two choices share the row. Each is as wide as its words need, and they split what is left over. When both are
  // long the sport gives way first: its colour dot still says which it is, and a county cut short says nothing.
  pill: { flexGrow: 1, flexBasis: 'auto', height: 46, borderRadius: 23, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 10, paddingRight: 5 },
  sport: { flexShrink: 1, minWidth: 92 },
  place: { flexShrink: 0 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { flexGrow: 1, flexShrink: 1, minWidth: 0, fontSize: 13.5, fontWeight: '700' },
  badge: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { fontSize: 10.5, fontWeight: '800' },
  search: { height: 46, borderRadius: 23, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 14, paddingRight: 6 },
  input: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '600', paddingVertical: 8 },
  closeSearch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, borderWidth: 1 },
  noteText: { flex: 1, fontSize: 13, fontWeight: '600' },
});
