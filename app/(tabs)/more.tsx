import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/components/useTheme';
import { legalReady } from '@/constants/legal';
import { getSport } from '@/constants/sports';
import { useApp } from '@/context/AppContext';
import { SITE_URL } from '@/lib/config';
import { AGE_LABEL } from '@/utils/ageGroup';
import { GENDER_LABEL } from '@/utils/category';

type Icon = ComponentProps<typeof SymbolView>['name'];

function Section({ title, children }: { title: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.heading, { color: t.muted }]} accessibilityRole="header">{title.toUpperCase()}</Text>
      <View style={[styles.group, { backgroundColor: t.card, borderColor: t.border }]}>{children}</View>
    </View>
  );
}

interface RowProps {
  icon: Icon;
  label: string;
  /** The current choice, shown small under the label. */
  detail?: string;
  onPress: () => void;
  last?: boolean;
}

function Row({ icon, label, detail, onPress, last }: RowProps) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}: ${detail}` : label}
      style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: t.border }]}>
      <SymbolView name={icon} tintColor={t.tint} size={22} />
      <View style={styles.text}>
        <Text style={[styles.label, { color: t.text }]}>{label}</Text>
        {detail ? <Text style={[styles.detail, { color: t.muted }]} numberOfLines={1}>{detail}</Text> : null}
      </View>
      <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} tintColor={t.tabIconDefault} size={20} />
    </Pressable>
  );
}

const go = (href: Href) => () => router.push(href);

/**
 * Everything that is about the person or the app and not about one search: the sports and county they follow,
 * telling a friend, where the data comes from, and the small print. One fixed place, so nothing hides inside Filters.
 */
export default function MoreScreen() {
  const t = useTheme();
  const { mySports, myAge, myGender, myCounty, location } = useApp();
  const [told, setTold] = useState<string | null>(null);
  const legal = legalReady();

  const tellAFriend = async () => {
    const text = SITE_URL
      ? `Grassroots: every game, everywhere, here. Find sports fixtures near you on a map.\n${SITE_URL}`
      : 'Grassroots: every game, everywhere, here. Find sports fixtures near you on a map.';
    try {
      await Share.share({ message: text, title: 'Grassroots' });
    } catch {
      // A browser with no share sheet: put the words on the clipboard and say so.
      await Clipboard.setStringAsync(text);
      setTold('Copied. Paste it into a message.');
    }
  };

  const sports = mySports.length === 0 ? 'Every sport' : mySports.map((id) => getSport(id).name).join(', ');
  const who = `${AGE_LABEL[myAge]} · ${myGender === 'all' ? 'Men and women' : GENDER_LABEL[myGender]}`;
  const county = myCounty ?? (location ? 'Using your location' : 'All Ireland');

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.content}>
      <Section title="What I follow">
        <Row icon={{ ios: 'sportscourt', android: 'sports', web: 'sports' }} label="My sports" detail={sports} onPress={go('/sports')} />
        <Row icon={{ ios: 'person.2', android: 'groups', web: 'groups' }} label="Age and men or women" detail={who} onPress={go('/filters')} />
        <Row icon={{ ios: 'mappin', android: 'location_on', web: 'location_on' }} label="My county" detail={county} onPress={go('/county')} last />
      </Section>

      <Section title="Grassroots">
        <Row icon={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }} label="Tell a friend" detail={told ?? 'Send someone the link'} onPress={tellAFriend} />
        <Row icon={{ ios: 'info.circle', android: 'info', web: 'info' }} label="Credits" detail="Where the fixtures and maps come from" onPress={go('/credits')} last={!legal && !__DEV__} />
        {legal ? <Row icon={{ ios: 'lock', android: 'shield', web: 'shield' }} label="Privacy" onPress={go('/privacy')} /> : null}
        {legal ? <Row icon={{ ios: 'doc.text', android: 'gavel', web: 'gavel' }} label="Terms of use" onPress={go('/terms')} last={!__DEV__} /> : null}
        {__DEV__ ? <Row icon={{ ios: 'plus.circle', android: 'settings', web: 'settings' }} label="Add fixtures (admin)" onPress={go('/admin')} last /> : null}
      </Section>

      <Text style={[styles.small, { color: t.muted }]}>
        Fixtures are gathered from public sources and can change. Check with the club or the competition before you travel.
      </Text>
      <Text style={[styles.small, { color: t.muted }]}>
        Grassroots is independent and is not affiliated with any governing body, league or club.
      </Text>
      <Text style={[styles.version, { color: t.tabIconDefault }]}>Version {Constants.expoConfig?.version ?? '1'}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 22 },
  heading: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8, marginLeft: 6 },
  group: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 58, paddingHorizontal: 14, paddingVertical: 8 },
  text: { flex: 1, minWidth: 0 },
  label: { fontSize: 16, fontWeight: '700' },
  detail: { fontSize: 13, marginTop: 1 },
  small: { fontSize: 13, lineHeight: 19, marginHorizontal: 6, marginBottom: 8 },
  version: { fontSize: 12.5, textAlign: 'center', marginTop: 12 },
});
