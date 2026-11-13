import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useApp } from '@/context/AppContext';
import { activeFilterCount } from '@/utils/filterFixtures';
import { useTheme } from './useTheme';

interface Props {
  query: string;
  onChangeQuery: (q: string) => void;
}

/** The search bar at the top of Explore: type to search, with the filters button beside it. */
export function SearchPill({ query, onChangeQuery }: Props) {
  const t = useTheme();
  const { filters } = useApp();
  const count = activeFilterCount(filters);
  return (
    <View style={[styles.pill, { backgroundColor: t.card }]}>
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
        style={[styles.input, { color: t.text }]}
      />
      {query ? (
        <Pressable
          onPress={() => onChangeQuery('')}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={10}
          style={styles.clear}>
          <SymbolView name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }} tintColor={t.muted} size={20} />
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => router.push('/filters')}
        accessibilityRole="button"
        accessibilityLabel="Change where and when"
        style={[styles.action, { borderColor: count ? t.tint : t.border, backgroundColor: count ? t.tint : t.card }]}>
        <Text style={[styles.actionText, { color: count ? t.onTint : t.text }]}>
          {count ? `Filters · ${count}` : 'Filters'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    paddingLeft: 16,
    paddingRight: 8,
    minHeight: 56,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  input: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '600', paddingVertical: 10 },
  clear: { padding: 4 },
  action: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  actionText: { fontSize: 13, fontWeight: '700' },
});
