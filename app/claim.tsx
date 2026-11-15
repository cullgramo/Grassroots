import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { useTheme } from '@/components/useTheme';
import { claimClub, claimProblems, MESSAGE_MAX, ROLES, type Role } from '@/lib/feedback';
import { report } from '@/lib/report';

/** A club officer asks to manage their club's page. Free; we check each claim by hand before anything changes. */
export default function ClaimScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<{ club?: string; county?: string }>();
  const [club, setClub] = useState(params.club ?? '');
  const [county, setCounty] = useState(params.county ?? '');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [tried, setTried] = useState(false);
  const [state, setState] = useState<'editing' | 'sending' | 'sent' | 'failed'>('editing');

  const problems = claimProblems({ club, name, role: role ?? undefined, email });
  const send = async () => {
    setTried(true);
    if (problems.length || !role) return;
    setState('sending');
    try {
      const ok = await claimClub({ club, county, name, role, email, message });
      setState(ok ? 'sent' : 'failed');
    } catch (e) {
      report(e, 'sending a club claim');
      setState('failed');
    }
  };

  if (state === 'sent') {
    return (
      <View style={[styles.screen, styles.done, { backgroundColor: t.background }]}>
        <Stack.Screen options={{ title: 'Thanks' }} />
        <Text style={[styles.title, { color: t.text }]}>Thanks, we’ll be in touch.</Text>
        <Text style={[styles.text, { color: t.muted }]}>
          We check every claim with the club before anything changes. Expect an email from us within a few days.
        </Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={[styles.primary, { backgroundColor: t.tint }]}>
          <Text style={[styles.primaryText, { color: t.onTint }]}>Done</Text>
        </Pressable>
      </View>
    );
  }

  const input = [styles.input, { color: t.text, backgroundColor: t.card, borderColor: t.border }];
  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Claim your club' }} />
      <Text style={[styles.title, { color: t.text }]}>Claim your club, free</Text>
      <Text style={[styles.text, { color: t.muted }]}>
        For club officers. Once we’ve checked it’s you, you can confirm your club’s fixtures so parents and supporters
        always see the right time and pitch.
      </Text>

      <Text style={[styles.label, { color: t.text }]}>Club</Text>
      <TextInput value={club} onChangeText={setClub} placeholder="Club name" placeholderTextColor={t.muted} accessibilityLabel="Club name" style={input} />
      <Text style={[styles.label, { color: t.text }]}>County</Text>
      <TextInput value={county} onChangeText={setCounty} placeholder="County" placeholderTextColor={t.muted} accessibilityLabel="County" style={input} />
      <Text style={[styles.label, { color: t.text }]}>Your name</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={t.muted} accessibilityLabel="Your name" autoComplete="name" style={input} />
      <Text style={[styles.label, { color: t.text }]}>Your role</Text>
      <View style={styles.chips}>
        {ROLES.map((r) => (
          <Chip key={r} label={r} selected={role === r} onPress={() => setRole(r)} />
        ))}
      </View>
      <Text style={[styles.label, { color: t.text }]}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="A club or personal email we can reach you on"
        placeholderTextColor={t.muted}
        accessibilityLabel="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        style={input}
      />
      <Text style={[styles.label, { color: t.text }]}>Anything else? (optional)</Text>
      <TextInput
        value={message}
        onChangeText={(v) => setMessage(v.slice(0, MESSAGE_MAX))}
        multiline
        placeholder="For example, which teams you look after"
        placeholderTextColor={t.muted}
        accessibilityLabel="Message"
        style={[...input, styles.multi]}
      />
      <Text style={[styles.hint, { color: t.muted }]}>
        We use these details only to check your claim and contact you about your club’s page. Please don’t include
        details of players.
      </Text>

      {tried && problems.length ? <Text style={styles.error}>{problems.join(' ')}</Text> : null}
      {state === 'failed' ? <Text style={styles.error}>That didn’t send. Check the details and your connection, then try again.</Text> : null}
      <Pressable onPress={send} disabled={state === 'sending'} accessibilityRole="button" style={[styles.primary, { backgroundColor: t.tint }]}>
        {state === 'sending' ? <ActivityIndicator color={t.onTint} /> : <Text style={[styles.primaryText, { color: t.onTint }]}>Send claim</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  done: { padding: 24, justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  text: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  label: { fontSize: 15, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  multi: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  hint: { fontSize: 13, marginTop: 8 },
  error: { color: '#dc2626', fontSize: 14, marginTop: 12 },
  primary: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  primaryText: { fontSize: 16, fontWeight: '800' },
});
