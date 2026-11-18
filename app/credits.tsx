import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/components/useTheme';
import { DATA_CREDITS, FIXTURE_SOURCES, NOT_AFFILIATED } from '@/constants/credits';

/** Where the fixtures, grounds and maps come from. Always visible: crediting these is a condition of using them. */
export default function CreditsScreen() {
  const t = useTheme();
  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.body, { color: t.text }]}>
        Grassroots brings together fixtures that clubs, leagues and governing bodies publish, and places them on a map. This page says where each part comes from.
      </Text>

      <Text style={[styles.heading, { color: t.text }]} accessibilityRole="header">Maps and grounds</Text>
      {DATA_CREDITS.map((c) => (
        <View key={c.name} style={styles.item}>
          <Text style={[styles.name, { color: t.text }]}>{c.name}</Text>
          <Text style={[styles.body, { color: t.text }]}>{c.note}</Text>
          {c.url ? (
            <Pressable onPress={() => Linking.openURL(c.url!)} accessibilityRole="link" hitSlop={8}>
              <Text style={[styles.link, { color: t.tint }]}>{c.url.replace(/^https?:\/\/(www\.)?/, '')}</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      <Text style={[styles.heading, { color: t.text }]} accessibilityRole="header">Fixtures</Text>
      <Text style={[styles.body, { color: t.text }]}>
        Fixtures are read from the public fixtures pages of the bodies below. Each fixture opens with a link to check it at its source.
      </Text>
      {FIXTURE_SOURCES.map((g) => (
        <View key={g.sport} style={styles.item}>
          <Text style={[styles.name, { color: t.text }]}>{g.sport}</Text>
          <Text style={[styles.body, { color: t.text }]}>{g.sources.join(', ')}.</Text>
        </View>
      ))}

      <Text style={[styles.heading, { color: t.text }]} accessibilityRole="header">Independent</Text>
      <Text style={[styles.body, { color: t.text }]}>{NOT_AFFILIATED}</Text>
      <Text style={[styles.body, styles.gap, { color: t.text }]}>
        If you publish fixtures listed here and would like them shown differently, or not at all, use “Something wrong with this fixture?” on any fixture to tell us.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  heading: { fontSize: 20, fontWeight: '800', marginTop: 24, marginBottom: 8 },
  item: { marginTop: 12 },
  name: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  body: { fontSize: 15, lineHeight: 22 },
  link: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  gap: { marginTop: 12 },
});
