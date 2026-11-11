import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useApp } from '@/context/AppContext';
import { activeFilterCount, describeWhen, describeWhere } from '@/utils/filterFixtures';
import { useTheme } from './useTheme';

export function SearchPill() {
  const t = useTheme();
  const { filters, location } = useApp();
  const count = activeFilterCount(filters);
  return (
    <Pressable
      onPress={() => router.push('/filters')}
      accessibilityRole="button"
      accessibilityLabel="Change where and when"
      style={[styles.pill, { backgroundColor: t.card }]}>
      <View style={styles.text}>
        <Text style={[styles.where, { color: t.text }]} numberOfLines={1}>
          {describeWhere(filters, !!location)}
        </Text>
        <Text style={[styles.when, { color: t.muted }]} numberOfLines={1}>
          {describeWhen(filters)}
        </Text>
      </View>
      <View style={[styles.action, { borderColor: count ? t.tint : t.border, backgroundColor: count ? t.tint : t.card }]}>
        <Text style={[styles.actionText, { color: count ? t.onTint : t.text }]}>
          {count ? `Filters · ${count}` : 'Filters'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingLeft: 20,
    paddingRight: 8,
    minHeight: 56,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  text: { flex: 1 },
  where: { fontSize: 15, fontWeight: '800' },
  when: { fontSize: 12, marginTop: 1 },
  action: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  actionText: { fontSize: 13, fontWeight: '700' },
});
