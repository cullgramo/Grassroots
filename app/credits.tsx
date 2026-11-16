import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/components/useTheme';
import { CREDITS_NOTE, CREDITS_UPDATED, FIXTURE_CREDITS, MAP_CREDITS, type CreditLink } from '@/constants/credits';

// DRAFT: for the owner's review. Always visible (it holds no placeholders and the licences ask for the credit).
// The list lives in constants/credits.ts.
function LinkRow({ link }: { link: CreditLink }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => WebBrowser.openBrowserAsync(link.url)}
      accessibilityRole="link"
      accessibilityLabel={link.name}
      style={styles.link}>
      <Text style={[styles.linkText, { color: t.tint }]}>{link.name}</Text>
    </Pressable>
  );
}

export default function CreditsScreen() {
  const t = useTheme();
  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.content}>
      {MAP_CREDITS.map((c) => (
        <View key={c.heading} style={styles.section}>
          <Text style={[styles.heading, { color: t.text }]} accessibilityRole="header">{c.heading}</Text>
          <Text style={[styles.body, { color: t.text }]}>{c.body}</Text>
          {c.links.map((l) => <LinkRow key={l.url} link={l} />)}
        </View>
      ))}
      <Text style={[styles.big, { color: t.text }]} accessibilityRole="header">Fixtures come from</Text>
      {FIXTURE_CREDITS.map((g) => (
        <View key={g.heading} style={styles.section}>
          <Text style={[styles.heading, { color: t.text }]} accessibilityRole="header">{g.heading}</Text>
          {g.intro ? <Text style={[styles.body, { color: t.muted }]}>{g.intro}</Text> : null}
          {g.links.map((l) => <LinkRow key={l.url} link={l} />)}
        </View>
      ))}
      <Text style={[styles.body, { color: t.muted }]}>{CREDITS_NOTE}</Text>
      <Text style={[styles.updated, { color: t.muted }]}>Last updated {CREDITS_UPDATED}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  section: { marginBottom: 20 },
  big: { fontSize: 22, fontWeight: '800', marginBottom: 12, marginTop: 4 },
  heading: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  body: { fontSize: 15, lineHeight: 22 },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { fontSize: 15, textDecorationLine: 'underline' },
  updated: { fontSize: 13, marginTop: 8 },
});
