import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { countSponsor, liveSponsors, pickSponsor, type Sponsor, type SponsorContext } from '@/lib/sponsors';
import { useTheme } from './useTheme';

/** A clearly labelled "Presented by" line. Shows nothing when no sponsor fits, so no empty box ever appears. */
export function SponsorSlot(ctx: SponsorContext) {
  const t = useTheme();
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const key = JSON.stringify([ctx.clubs ?? [], ctx.competition ?? '', ctx.county ?? '']);

  useEffect(() => {
    let live = true;
    liveSponsors().then((list) => {
      if (live) setSponsor(pickSponsor(list, ctx));
    });
    return () => {
      live = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sponsor) countSponsor(sponsor.id, 'view');
  }, [sponsor]);

  if (!sponsor) return null;
  const body = (
    <View style={[styles.slot, { backgroundColor: t.card, borderColor: t.border }]}>
      <Text style={[styles.label, { color: t.muted }]}>SPONSOR · PRESENTED BY</Text>
      <Text style={[styles.name, { color: t.text }]}>{sponsor.name}</Text>
      {sponsor.tagline ? <Text style={[styles.tagline, { color: t.muted }]}>{sponsor.tagline}</Text> : null}
    </View>
  );
  if (!sponsor.url) return body;
  return (
    <Pressable
      onPress={() => {
        countSponsor(sponsor.id, 'tap');
        WebBrowser.openBrowserAsync(sponsor.url!);
      }}
      accessibilityRole="link"
      accessibilityLabel={`Sponsor: ${sponsor.name}`}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { borderWidth: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, marginTop: 16 },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  name: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  tagline: { fontSize: 13, marginTop: 2 },
});
