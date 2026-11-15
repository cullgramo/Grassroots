import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { useTheme } from '@/components/useTheme';
import { useApp } from '@/context/AppContext';
import { NOTE_MAX, PROBLEMS, reportFixture, type Problem } from '@/lib/feedback';
import { report } from '@/lib/report';
import { fixtureTitle } from '@/types/fixture';

/** "Something wrong with this fixture?" One tap for the problem, an optional note, and it is sent. No sign-in. */
export default function ReportScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { allFixtures } = useApp();
  const fixture = allFixtures.find((f) => f.id === id);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'editing' | 'sending' | 'sent' | 'failed'>('editing');

  const send = async () => {
    if (!problem || !id) return;
    setState('sending');
    try {
      await reportFixture(id, problem, note);
      setState('sent');
    } catch (e) {
      report(e, 'sending a fixture report');
      setState('failed');
    }
  };

  if (state === 'sent') {
    return (
      <View style={[styles.screen, styles.done, { backgroundColor: t.background }]}>
        <Stack.Screen options={{ title: 'Thanks' }} />
        <Text style={[styles.title, { color: t.text }]}>Thanks, we’ll check it.</Text>
        <Text style={[styles.text, { color: t.muted }]}>
          Reports go straight to the people who keep the fixtures right. If it’s urgent, check with the club too.
        </Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={[styles.primary, { backgroundColor: t.tint }]}>
          <Text style={[styles.primaryText, { color: t.onTint }]}>Done</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Something wrong?' }} />
      {fixture ? <Text style={[styles.fixture, { color: t.muted }]}>{fixtureTitle(fixture)} · {fixture.venue}</Text> : null}
      <Text style={[styles.title, { color: t.text }]}>What’s wrong?</Text>
      <View style={styles.chips}>
        {PROBLEMS.map((p) => (
          <Chip key={p.id} label={p.label} selected={problem === p.id} onPress={() => setProblem(p.id)} />
        ))}
      </View>
      <Text style={[styles.label, { color: t.text }]}>Anything we should know? (optional)</Text>
      <TextInput
        value={note}
        onChangeText={(v) => setNote(v.slice(0, NOTE_MAX))}
        multiline
        placeholder="For example: moved to 2pm, or played at the club’s second pitch"
        placeholderTextColor={t.muted}
        accessibilityLabel="Note"
        style={[styles.input, { color: t.text, backgroundColor: t.card, borderColor: t.border }]}
      />
      <Text style={[styles.hint, { color: t.muted }]}>Please don’t include anyone’s name or contact details.</Text>
      {state === 'failed' ? <Text style={styles.error}>That didn’t send. Check your connection and try again.</Text> : null}
      <Pressable
        onPress={send}
        disabled={!problem || state === 'sending'}
        accessibilityRole="button"
        accessibilityState={{ disabled: !problem || state === 'sending' }}
        style={[styles.primary, { backgroundColor: t.tint, opacity: problem ? 1 : 0.4 }]}>
        {state === 'sending' ? <ActivityIndicator color={t.onTint} /> : <Text style={[styles.primaryText, { color: t.onTint }]}>Send report</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  done: { padding: 24, justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 48 },
  fixture: { fontSize: 14, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 14 },
  text: { fontSize: 15, lineHeight: 22, marginBottom: 24 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  label: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 90, fontSize: 15, textAlignVertical: 'top' },
  hint: { fontSize: 13, marginTop: 6 },
  error: { color: '#dc2626', fontSize: 14, marginTop: 12 },
  primary: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  primaryText: { fontSize: 16, fontWeight: '800' },
});
