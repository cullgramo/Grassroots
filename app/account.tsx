import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/components/useTheme';
import { legalReady } from '@/constants/legal';
import { useAccount } from '@/context/AccountContext';
import { AuthError, looksLikeCode, looksLikeEmail } from '@/lib/auth';
import { report } from '@/lib/report';

/** Words fit to show for any failure: our own where we wrote them, a plain connection message otherwise. */
const say = (e: unknown, fallback: string) => (e instanceof AuthError ? e.message : fallback);

/** On the website the file is downloaded; on a phone it goes to the share sheet (Files, email, notes). */
async function hand(json: string) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grassroots-my-data.json';
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ message: json, title: 'My Grassroots data' });
}

/** Sign in with an emailed code, or, once signed in: sign out, download my data, delete my account. */
export default function AccountScreen() {
  const t = useTheme();
  const account = useAccount();
  const input = [styles.input, { color: t.text, backgroundColor: t.card, borderColor: t.border }];

  if (account.status === 'starting') {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: t.background }]}>
        <ActivityIndicator color={t.tint} />
      </View>
    );
  }
  return account.status === 'signedIn' ? <SignedIn input={input} /> : <SignIn input={input} />;
}

type InputStyle = object[];

function SignIn({ input }: { input: InputStyle }) {
  const t = useTheme();
  const { sendCode, signIn } = useAccount();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [oldEnough, setOldEnough] = useState(false);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const askForCode = async () => {
    if (!looksLikeEmail(email)) return setProblem('Add your email address.');
    if (!oldEnough) return setProblem('Accounts are for people aged 16 or over. You can still use everything in Grassroots without one.');
    setProblem(null);
    setBusy(true);
    try {
      await sendCode(email);
      setStep('code');
    } catch (e) {
      report(e, 'sending a sign-in code');
      setProblem(say(e, 'The code could not be sent. Check your connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const checkCode = async () => {
    if (!looksLikeCode(code)) return setProblem('Type the code from the email: only the numbers.');
    setProblem(null);
    setBusy(true);
    try {
      await signIn(email, code);
    } catch (e) {
      report(e, 'checking a sign-in code');
      setProblem(say(e, 'Sign-in did not work. Check your connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">Sign in</Text>
      <Text style={[styles.text, { color: t.muted }]}>
        Optional. Signing in keeps your saved games, the clubs you follow and your choices the same on every phone and on
        the website. There is no password: we email you a code each time.
      </Text>

      {step === 'email' ? (
        <>
          <Text style={[styles.label, { color: t.text }]}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.ie"
            placeholderTextColor={t.muted}
            accessibilityLabel="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={askForCode}
            style={input}
          />
          <View style={styles.switchRow}>
            <Text style={[styles.switchText, { color: t.text }]}>I am 16 or over</Text>
            <Switch value={oldEnough} onValueChange={setOldEnough} accessibilityLabel="I am 16 or over" trackColor={{ true: t.tint }} />
          </View>
          <Text style={[styles.hint, { color: t.muted }]}>
            We keep your email address only to sign you in, and never use it for marketing. You can delete your account,
            and everything with it, at any time from this screen.
          </Text>
          {legalReady() ? (
            <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link">
              <Text style={[styles.link, { color: t.tint }]}>How we look after your data</Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <>
          <Text style={[styles.text, { color: t.text }]}>We sent a code to {email.trim()}. It works for one hour.</Text>
          <Text style={[styles.label, { color: t.text }]}>Code</Text>
          <TextInput
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 10))}
            placeholder="123456"
            placeholderTextColor={t.muted}
            accessibilityLabel="Code from the email"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            returnKeyType="done"
            onSubmitEditing={checkCode}
            style={[...input, styles.code]}
          />
          <Pressable onPress={() => { setStep('email'); setCode(''); setProblem(null); }} accessibilityRole="button">
            <Text style={[styles.link, { color: t.tint }]}>Use a different email, or send a new code</Text>
          </Pressable>
        </>
      )}

      {problem ? <Text style={styles.error} accessibilityLiveRegion="polite">{problem}</Text> : null}
      <Pressable
        onPress={step === 'email' ? askForCode : checkCode}
        disabled={busy}
        accessibilityRole="button"
        style={[styles.primary, { backgroundColor: t.tint }]}>
        {busy ? <ActivityIndicator color={t.onTint} /> : <Text style={[styles.primaryText, { color: t.onTint }]}>{step === 'email' ? 'Email me a code' : 'Sign in'}</Text>}
      </Pressable>
    </ScrollView>
  );
}

function SignedIn({ input }: { input: InputStyle }) {
  const t = useTheme();
  const { email, sync, signOut, exportData, deleteAccount } = useAccount();
  const [busy, setBusy] = useState<'export' | 'delete' | 'out' | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');

  const syncLine =
    sync === 'saving' ? 'Saving to your account…'
      : sync === 'offline' ? 'Offline: your latest changes are on this phone and will be saved to your account when you are back online.'
        : 'Your saved games, clubs and choices are kept in your account.';

  const run = async (what: 'export' | 'delete' | 'out', job: () => Promise<void>, fallback: string) => {
    setProblem(null);
    setBusy(what);
    try {
      await job();
    } catch (e) {
      report(e, `account: ${what}`);
      setProblem(say(e, fallback));
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">Your account</Text>
      <Text style={[styles.text, { color: t.text }]}>Signed in as {email}</Text>
      <Text style={[styles.text, { color: t.muted }]}>{syncLine}</Text>

      <Pressable onPress={() => run('out', signOut, 'Could not sign out. Try again.')} disabled={!!busy} accessibilityRole="button" style={[styles.secondary, { borderColor: t.border, backgroundColor: t.card }]}>
        {busy === 'out' ? <ActivityIndicator color={t.tint} /> : <Text style={[styles.secondaryText, { color: t.text }]}>Sign out</Text>}
      </Pressable>
      <Text style={[styles.hint, { color: t.muted }]}>Signing out keeps your saved games on this phone. Your account keeps its copy too.</Text>

      <Text style={[styles.heading, { color: t.muted }]} accessibilityRole="header">YOUR DATA</Text>
      <Pressable
        onPress={() => run('export', async () => hand(await exportData()), 'Could not get your data just now. Check your connection and try again.')}
        disabled={!!busy}
        accessibilityRole="button"
        style={[styles.secondary, { borderColor: t.border, backgroundColor: t.card }]}>
        {busy === 'export' ? <ActivityIndicator color={t.tint} /> : <Text style={[styles.secondaryText, { color: t.text }]}>Download my data</Text>}
      </Pressable>
      <Text style={[styles.hint, { color: t.muted }]}>Everything your account holds, as a file you can keep or take elsewhere.</Text>

      {!confirming ? (
        <Pressable onPress={() => setConfirming(true)} disabled={!!busy} accessibilityRole="button" style={[styles.secondary, { borderColor: '#dc2626', backgroundColor: t.card }]}>
          <Text style={[styles.secondaryText, { color: '#dc2626' }]}>Delete my account</Text>
        </Pressable>
      ) : (
        <View style={[styles.confirm, { borderColor: '#dc2626', backgroundColor: t.card }]}>
          <Text style={[styles.text, { color: t.text }]}>
            This deletes your account, your email address and everything saved in it, straight away. It cannot be undone.
            Type DELETE to confirm.
          </Text>
          <TextInput value={typed} onChangeText={setTyped} autoCapitalize="characters" accessibilityLabel="Type DELETE to confirm" style={input} />
          <Pressable
            onPress={() => run('delete', deleteAccount, 'Your account could not be deleted just now. Check your connection and try again.')}
            disabled={typed.trim().toUpperCase() !== 'DELETE' || !!busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: typed.trim().toUpperCase() !== 'DELETE' }}
            style={[styles.primary, { backgroundColor: '#dc2626', opacity: typed.trim().toUpperCase() === 'DELETE' ? 1 : 0.4 }]}>
            {busy === 'delete' ? <ActivityIndicator color="#fff" /> : <Text style={[styles.primaryText, { color: '#fff' }]}>Delete for good</Text>}
          </Pressable>
          <Pressable onPress={() => { setConfirming(false); setTyped(''); }} accessibilityRole="button">
            <Text style={[styles.link, { color: t.tint, textAlign: 'center' }]}>Keep my account</Text>
          </Pressable>
        </View>
      )}

      {problem ? <Text style={styles.error} accessibilityLiveRegion="polite">{problem}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  text: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  heading: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginTop: 28, marginBottom: 8 },
  label: { fontSize: 15, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  code: { fontSize: 22, letterSpacing: 6, textAlign: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, minHeight: 44 },
  switchText: { fontSize: 15, fontWeight: '600', flex: 1 },
  hint: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  link: { fontSize: 15, fontWeight: '600', marginTop: 14, paddingVertical: 6 },
  error: { color: '#dc2626', fontSize: 14, marginTop: 12 },
  primary: { borderRadius: 14, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  primaryText: { fontSize: 16, fontWeight: '800' },
  secondary: { borderRadius: 14, borderWidth: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  secondaryText: { fontSize: 16, fontWeight: '700' },
  confirm: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 12 },
});
