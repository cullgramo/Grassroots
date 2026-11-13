import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { useTheme } from '@/components/useTheme';
import { ALL_SPORT_IDS, SPORTS, type SportId } from '@/constants/sports';
import { useApp } from '@/context/AppContext';
import { AGE_LABEL, type AgeFilter } from '@/utils/ageGroup';

export default function SportsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { mySports, setMySports, myAge, setMyAge } = useApp();
  const [picked, setPicked] = useState<SportId[]>(mySports);
  const [pickedAge, setPickedAge] = useState<AgeFilter>(myAge);

  const toggle = (id: SportId) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const everything = picked.length === 0 || picked.length === ALL_SPORT_IDS.length;

  const done = () => {
    setMySports(everything ? [] : picked);
    setMyAge(pickedAge);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: t.text }]}>Which sports do you follow?</Text>
        <Text style={[styles.text, { color: t.muted }]}>
          The map opens on these. You can still browse any sport, and change this later.
        </Text>
        <View style={styles.chips}>
          {SPORTS.map((s) => (
            <Chip
              key={s.id}
              label={s.name}
              dotColor={s.color}
              selected={picked.includes(s.id)}
              onPress={() => toggle(s.id)}
            />
          ))}
        </View>
        <Text style={[styles.title, styles.ageTitle, { color: t.text }]}>Which games?</Text>
        <Text style={[styles.text, { color: t.muted }]}>Adult games, underage and schools games, or both.</Text>
        <View style={styles.chips}>
          {(['all', 'adult', 'underage'] as AgeFilter[]).map((a) => (
            <Chip key={a} label={a === 'all' ? 'Both' : AGE_LABEL[a]} selected={pickedAge === a} onPress={() => setPickedAge(a)} />
          ))}
        </View>
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: t.card, borderColor: t.border, paddingBottom: insets.bottom + 12 }]}>
        <Pressable onPress={done} accessibilityRole="button" style={[styles.apply, { backgroundColor: t.tint }]}>
          <Text style={[styles.applyText, { color: t.onTint }]}>
            {everything ? 'Show every sport' : `Show ${picked.length} ${picked.length === 1 ? 'sport' : 'sports'}`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingTop: 28 },
  title: { fontSize: 26, fontWeight: '800' },
  text: { fontSize: 15, marginTop: 8, marginBottom: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ageTitle: { fontSize: 22, marginTop: 28 },
  footer: { padding: 12, borderTopWidth: 1 },
  apply: { minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  applyText: { fontSize: 17, fontWeight: '800' },
});
