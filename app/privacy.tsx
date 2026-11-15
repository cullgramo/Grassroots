import { Redirect } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/components/useTheme';
import { legalReady } from '@/constants/legal';
import { PRIVACY_UPDATED, privacySections } from '@/constants/privacy';

// DRAFT: for the owner's review and a solicitor's check. Hidden, like the terms, until the owner's name and contact
// address are filled in (constants/legal.ts) so a [PLACEHOLDER] never reaches a user. See constants/privacy.ts.
export default function PrivacyScreen() {
  const t = useTheme();
  if (!legalReady()) return <Redirect href="/" />;
  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.content}>
      {privacySections().map((s) => (
        <View key={s.heading} style={styles.section}>
          <Text style={[styles.heading, { color: t.text }]} accessibilityRole="header">{s.heading}</Text>
          <Text style={[styles.body, { color: t.text }]}>{s.body}</Text>
        </View>
      ))}
      <Text style={[styles.updated, { color: t.muted }]}>Last updated {PRIVACY_UPDATED}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  section: { marginBottom: 20 },
  heading: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  body: { fontSize: 15, lineHeight: 22 },
  updated: { fontSize: 13, marginTop: 8 },
});
