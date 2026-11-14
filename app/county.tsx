import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { useTheme } from '@/components/useTheme';
import { useApp } from '@/context/AppContext';
import { COUNTIES } from '@/data/counties';

/** Shown when location is off: the map has nowhere to open, so ask which county the user cares about. */
export default function CountyScreen() {
  const t = useTheme();
  const { myCounty, setMyCounty } = useApp();
  const choose = (county: string | null) => {
    setMyCounty(county);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: t.text }]}>Which county?</Text>
        <Text style={[styles.text, { color: t.muted }]}>
          Location is off, so pick the county you want to see. You can change it any time from Filters.
        </Text>
        <View style={styles.chips}>
          <Chip label="All Ireland" selected={myCounty == null} onPress={() => choose(null)} />
          {COUNTIES.map((c) => (
            <Chip key={c} label={c} selected={myCounty === c} onPress={() => choose(c)} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingTop: 28 },
  title: { fontSize: 26, fontWeight: '800' },
  text: { fontSize: 15, marginTop: 8, marginBottom: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
