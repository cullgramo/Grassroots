import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Linking, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import type { Fixture } from '@/types/fixture';
import { emailUrl, shareMessage, shareSubject, smsUrl, whatsAppUrl } from '@/utils/share';
import { useTheme } from './useTheme';

/**
 * Share a fixture. Four one-tap choices for the places people actually send fixtures (WhatsApp, a text,
 * email, copy), and "More" opens the phone's own share sheet for everything else installed
 * (Messenger, Facebook, Instagram, X, Telegram, Slack, AirDrop and so on).
 */
/** A "Share" word for the screen's top bar: one tap to the phone's own share sheet. */
export function ShareHeaderButton({ fixture }: { fixture: Fixture }) {
  const t = useTheme();
  const onPress = async () => {
    const text = shareMessage(fixture);
    try {
      await Share.share({ message: text, title: shareSubject(fixture) });
    } catch {
      await Clipboard.setStringAsync(text); // a browser with no share sheet
    }
  };
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel="Share this fixture" style={styles.header}>
      <Text style={[styles.headerText, { color: t.tint }]}>Share</Text>
    </Pressable>
  );
}

export function ShareFixture({ fixture }: { fixture: Fixture }) {
  const t = useTheme();
  const [note, setNote] = useState<string | null>(null);
  const text = shareMessage(fixture);

  const copy = async () => {
    await Clipboard.setStringAsync(text);
    setNote('Copied. Paste it anywhere.');
    setTimeout(() => setNote(null), 2500);
  };
  const more = async () => {
    try {
      await Share.share({ message: text, title: shareSubject(fixture) });
    } catch {
      await copy(); // a browser with no share sheet
    }
  };
  const open = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      await more(); // that app is not on this device
    }
  };

  const items: { label: string; hint: string; onPress: () => void }[] = [
    { label: 'WhatsApp', hint: 'Shares this fixture in WhatsApp', onPress: () => open(whatsAppUrl(text)) },
    { label: 'Text', hint: 'Shares this fixture in a text message', onPress: () => open(smsUrl(text, Platform.OS)) },
    { label: 'Email', hint: 'Shares this fixture by email', onPress: () => open(emailUrl(shareSubject(fixture), text)) },
    { label: 'Copy', hint: 'Copies the fixture details', onPress: copy },
    { label: 'More…', hint: 'Opens the share sheet for other apps', onPress: more },
  ];

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: t.text }]}>Share this fixture</Text>
      <View style={styles.row}>
        {items.map((i) => (
          <Pressable
            key={i.label}
            onPress={i.onPress}
            accessibilityRole="button"
            accessibilityLabel={i.label === 'More…' ? 'More ways to share' : `Share by ${i.label}`}
            accessibilityHint={i.hint}
            style={[styles.chip, { borderColor: t.border, backgroundColor: t.card }]}>
            <Text style={[styles.chipText, { color: t.text }]}>{i.label}</Text>
          </Pressable>
        ))}
      </View>
      {note ? <Text style={[styles.note, { color: t.muted }]}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 24 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 15, fontWeight: '700' },
  note: { fontSize: 13, marginTop: 8 },
  header: { paddingHorizontal: 6, paddingVertical: 4 },
  headerText: { fontSize: 16, fontWeight: '700' },
});
