import { forwardRef } from 'react';
import type { HostInstance } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import type { Fixture } from '@/types/fixture';
import { cardContent } from '@/utils/shareCard';

/** The size of the card in layout points. The picture is made at the phone's pixel density (3x on most phones). */
export const CARD_WIDTH = 320;
export const CARD_HEIGHT = 420;

const INK = '#10281F';
const PAPER = '#FFFFFF';
const MUTED = '#4A5A52';

/**
 * The picture that is shared: one fixture, as plain and readable as possible. Who plays, when, and where.
 * Dark text on white in every chat; the sport's colour is only a side stripe, and no text sits on it.
 * No club crests or league logos are used.
 */
export const FixtureShareCard = forwardRef<HostInstance, { fixture: Fixture }>(function FixtureShareCard({ fixture }, ref) {
  const c = cardContent(fixture);
  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={[styles.stripe, { backgroundColor: c.color }]} />
      <View style={styles.body}>
        <View>
          <Text style={styles.sport}>{c.sport}</Text>
          {c.alert ? (
            <View style={styles.alert}>
              <Text style={styles.alertText}>{c.alert}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.teams}>
          {c.heading.map((line, i) => (
            <View key={i}>
              {i === 1 ? <Text style={styles.versus}>v</Text> : null}
              <Text style={styles.team} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>{line}</Text>
            </View>
          ))}
        </View>
        <View>
          <Text style={c.time.length > 5 ? styles.timeSmall : styles.time}>{c.time}</Text>
          <Text style={styles.day}>{c.day}</Text>
        </View>
        <View>
          <Text style={styles.where} numberOfLines={2}>{c.where}</Text>
          <Text style={styles.brand}>Grassroots</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { width: CARD_WIDTH, height: CARD_HEIGHT, backgroundColor: PAPER, borderRadius: 20, overflow: 'hidden', flexDirection: 'row' },
  stripe: { width: 14 },
  body: { flex: 1, paddingHorizontal: 22, paddingVertical: 20, justifyContent: 'space-between' },
  sport: { color: MUTED, fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
  alert: { alignSelf: 'flex-start', backgroundColor: '#b91c1c', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, marginTop: 8 },
  alertText: { color: '#ffffff', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  teams: { gap: 2 },
  team: { color: INK, fontSize: 28, fontWeight: '800', lineHeight: 32 },
  versus: { color: MUTED, fontSize: 18, fontWeight: '700', marginVertical: 3 },
  time: { color: INK, fontSize: 52, fontWeight: '800', lineHeight: 56 },
  timeSmall: { color: INK, fontSize: 34, fontWeight: '800', lineHeight: 40 },
  day: { color: INK, fontSize: 22, fontWeight: '700', letterSpacing: 0.5 },
  where: { color: INK, fontSize: 18, fontWeight: '600', lineHeight: 23 },
  brand: { color: MUTED, fontSize: 14, fontWeight: '800', marginTop: 10 },
});
