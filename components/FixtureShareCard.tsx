import { forwardRef } from 'react';
import type { HostInstance } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import type { Fixture } from '@/types/fixture';
import { cardContent } from '@/utils/shareCard';

/** The size of the card in layout points. The picture is made at the phone's pixel density (3x on most phones). */
export const CARD_WIDTH = 320;
export const CARD_HEIGHT = 440;

const INK = '#10281F';
const PAPER = '#F6F5EF';
const SOFT = '#B9CFC4';
const AMBER = '#E3A52B';

/**
 * The picture that is shared: one fixture on a card. It has fixed colours (not the app's light or dark theme),
 * so it looks the same in every chat. The sport's colour is only a stripe; no text sits on it.
 * No club crests or league logos are used.
 */
export const FixtureShareCard = forwardRef<HostInstance, { fixture: Fixture }>(function FixtureShareCard({ fixture }, ref) {
  const c = cardContent(fixture);
  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={[styles.stripe, { backgroundColor: c.color }]} />
      <View style={styles.body}>
        <Text style={styles.kicker} numberOfLines={1}>{c.kicker}</Text>
        {c.alert ? (
          <View style={styles.alert}>
            <Text style={styles.alertText}>{c.alert}</Text>
          </View>
        ) : null}
        <View style={styles.teams}>
          {c.heading.map((line, i) => (
            <View key={i}>
              {i === 1 ? <Text style={styles.versus}>v</Text> : null}
              <Text style={styles.team} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>{line}</Text>
            </View>
          ))}
          {c.competition ? <Text style={styles.competition} numberOfLines={1}>{c.competition}</Text> : null}
        </View>
        <View style={styles.when}>
          <Text style={styles.day}>{c.day}</Text>
          <Text style={styles.time}>{c.time}</Text>
          <Text style={styles.timeLabel}>{c.timeLabel}</Text>
        </View>
        <Text style={styles.where} numberOfLines={2}>{c.where}</Text>
        <View style={styles.footer}>
          <Text style={styles.brand}>Grassroots</Text>
          <Text style={styles.tagline}>Every game. Everywhere. On a map.</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { width: CARD_WIDTH, height: CARD_HEIGHT, backgroundColor: INK, borderRadius: 20, overflow: 'hidden' },
  stripe: { height: 10 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 14, paddingBottom: 14, justifyContent: 'space-between' },
  kicker: { color: SOFT, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  alert: { alignSelf: 'flex-start', backgroundColor: '#b91c1c', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 },
  alertText: { color: '#ffffff', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  teams: { gap: 2 },
  team: { color: PAPER, fontSize: 25, fontWeight: '800', lineHeight: 29 },
  versus: { color: SOFT, fontSize: 15, fontWeight: '700', marginVertical: 2 },
  competition: { color: SOFT, fontSize: 14, marginTop: 8 },
  when: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#3B5A4D', paddingTop: 12 },
  day: { color: PAPER, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  time: { color: AMBER, fontSize: 40, fontWeight: '800', lineHeight: 46 },
  timeLabel: { color: SOFT, fontSize: 13 },
  where: { color: PAPER, fontSize: 16, fontWeight: '600' },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#3B5A4D', paddingTop: 10 },
  brand: { color: PAPER, fontSize: 16, fontWeight: '800' },
  tagline: { color: SOFT, fontSize: 12, marginTop: 1 },
});
