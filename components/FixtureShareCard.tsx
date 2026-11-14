import { forwardRef } from 'react';
import type { HostInstance } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import type { Fixture } from '@/types/fixture';
import { cardContent } from '@/utils/shareCard';

/** The size of the card in layout points. The picture is made at the phone's pixel density (3x on most phones). */
export const CARD_WIDTH = 320;
export const CARD_HEIGHT = 340;

const INK = '#10281F';
const PAPER = '#FFFFFF';
const MUTED = '#4A5A52';

/**
 * The picture that is shared: three things only. Who plays, when, and where.
 * Dark text on white; the sport's colour is a thin stripe on top. No crests or logos.
 */
export const FixtureShareCard = forwardRef<HostInstance, { fixture: Fixture }>(function FixtureShareCard({ fixture }, ref) {
  const c = cardContent(fixture);
  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={[styles.stripe, { backgroundColor: c.color }]} />
      <View style={styles.body}>
        {c.alert ? (
          <View style={styles.alert}>
            <Text style={styles.alertText}>{c.alert}</Text>
          </View>
        ) : null}
        <View>
          {c.heading.map((line, i) => (
            <View key={i}>
              {i === 1 ? <Text style={styles.versus}>v</Text> : null}
              <Text style={styles.team} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>{line}</Text>
            </View>
          ))}
        </View>
        <View>
          <Text style={styles.when}>{c.day} · {c.time}</Text>
          <Text style={styles.where} numberOfLines={2}>{c.where}</Text>
        </View>
        <Text style={styles.brand}>Grassroots</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { width: CARD_WIDTH, height: CARD_HEIGHT, backgroundColor: PAPER, borderRadius: 20, overflow: 'hidden' },
  stripe: { height: 8 },
  body: { flex: 1, padding: 24, justifyContent: 'space-between' },
  alert: { alignSelf: 'flex-start', backgroundColor: '#b91c1c', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  alertText: { color: '#ffffff', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  team: { color: INK, fontSize: 28, fontWeight: '800', lineHeight: 33 },
  versus: { color: MUTED, fontSize: 17, fontWeight: '600', marginVertical: 2 },
  when: { color: INK, fontSize: 24, fontWeight: '800' },
  where: { color: MUTED, fontSize: 18, fontWeight: '500', lineHeight: 23, marginTop: 4 },
  brand: { color: MUTED, fontSize: 13, fontWeight: '700' },
});
