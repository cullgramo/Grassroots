import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SaveButton } from '@/components/FixtureCard';
import { FixtureMap } from '@/components/FixtureMap';
import { ShareFixture, ShareHeaderButton } from '@/components/ShareFixture';
import { useTheme } from '@/components/useTheme';
import { getSport } from '@/constants/sports';
import { useApp } from '@/context/AppContext';
import { fixtureTitle } from '@/types/fixture';
import { timeLabel } from '@/utils/date';
import { formatDistance } from '@/utils/distance';
import { entryLabel, ticketLink, ticketSearchLink } from '@/utils/tickets';
import { distanceTo } from '@/utils/filterFixtures';

function Row({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={[styles.row, { borderColor: t.border }]}>
      <Text style={[styles.rowLabel, { color: t.muted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: t.text }]}>{value}</Text>
    </View>
  );
}

export default function FixtureScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { location, allFixtures, loadState } = useApp();
  const fixture = allFixtures.find((f) => f.id === id);

  if (!fixture) {
    return (
      <View style={[styles.missing, { backgroundColor: t.background }]}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <Text style={[styles.rowValue, { color: t.text }]}>{loadState === 'loading' ? 'Loading…' : 'This fixture is no longer listed.'}</Text>
      </View>
    );
  }

  const sport = getSport(fixture.sport);
  const color = sport.color;
  const km = distanceTo(fixture, location);
  const date = new Date(fixture.startsAt).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const tickets = ticketLink(fixture);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${fixture.latitude},${fixture.longitude}`;

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: sport.name,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ShareHeaderButton fixture={fixture} />
              <SaveButton fixture={fixture} size={26} />
            </View>
          ),
        }}
      />

      <View style={styles.map}>
        <FixtureMap fixtures={[fixture]} selectedId={fixture.id} userLocation={location} interactive={false} />
      </View>

      <View style={styles.body}>
        <Text style={[styles.sport, { color }]}>
          {sport.name.toUpperCase()} · {fixture.level.toUpperCase()}
        </Text>
        {fixture.homeTeam && fixture.awayTeam ? (
          <>
            <Text style={[styles.teams, { color: t.text }]}>{fixture.homeTeam}</Text>
            <Text style={[styles.versus, { color: t.muted }]}>v</Text>
            <Text style={[styles.teams, { color: t.text }]}>{fixture.awayTeam}</Text>
          </>
        ) : (
          <Text style={[styles.teams, { color: t.text }]}>{fixtureTitle(fixture)}</Text>
        )}
        <Text style={[styles.competition, { color: t.muted }]}>{fixture.competition}</Text>

        {fixture.status === 'cancelled' || fixture.status === 'postponed' ? (
          <View style={styles.alert}>
            <Text style={styles.alertText}>
              {fixture.status === 'cancelled' ? 'This fixture has been cancelled.' : 'This fixture has been postponed.'}
            </Text>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <Row label="Date" value={date} />
          <Row label={sport.startWord} value={fixture.timeTbc ? 'To be confirmed' : timeLabel(fixture.startsAt)} />
          <Row label="Venue" value={`${fixture.venue}, ${fixture.county}`} />
          {km != null ? <Row label="Distance" value={`${formatDistance(km)} away`} /> : null}
          <Row label="Entry" value={entryLabel(fixture)} />
        </View>

        {tickets ? (
          <Pressable
            onPress={() => WebBrowser.openBrowserAsync(tickets.url)}
            accessibilityRole="link"
            accessibilityHint={tickets.kind === 'search' ? 'Searches the web for tickets' : 'Opens the ticket seller'}
            style={[styles.primary, { backgroundColor: t.tint }]}>
            <Text style={[styles.primaryText, { color: t.onTint }]}>Get tickets</Text>
          </Pressable>
        ) : null}
        {tickets?.kind === 'search' ? (
          <Text style={[styles.hint, { color: t.muted }]}>No ticket link listed yet, so this searches the web.</Text>
        ) : null}
        {!tickets ? (
          <Text style={[styles.hint, { color: t.muted }]}>
            The source does not say whether tickets are needed. Check with the club or the competition.
          </Text>
        ) : null}
        {!tickets && fixture.level === 'Top level' ? (
          <Pressable
            onPress={() => WebBrowser.openBrowserAsync(ticketSearchLink(fixture))}
            accessibilityRole="link"
            accessibilityHint="Searches the web for tickets"
            style={[styles.secondary, { borderColor: t.tint }]}>
            <Text style={[styles.secondaryText, { color: t.tint }]}>Search for tickets</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => Linking.openURL(directions)}
          accessibilityRole="link"
          style={[styles.primary, { backgroundColor: t.tint }]}>
          <Text style={[styles.primaryText, { color: t.onTint }]}>
            Get directions
          </Text>
        </Pressable>
        <ShareFixture fixture={fixture} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  map: { height: 220 },
  body: { padding: 16 },
  sport: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, marginBottom: 8 },
  teams: { fontSize: 28, fontWeight: '800' },
  versus: { fontSize: 15, fontWeight: '600', marginVertical: 2 },
  competition: { fontSize: 15, marginTop: 8 },
  card: { borderRadius: 16, borderWidth: 1, marginTop: 20, paddingHorizontal: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLabel: { fontSize: 15 },
  rowValue: { fontSize: 15, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  primary: { minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  primaryText: { fontSize: 17, fontWeight: '800' },
  alert: { backgroundColor: '#fee2e2', borderRadius: 12, padding: 12, marginTop: 16 },
  alertText: { color: '#991b1b', fontSize: 15, fontWeight: '700' },
  hint: { fontSize: 13, textAlign: 'center', marginTop: 8 },
  secondary: { minHeight: 52, borderRadius: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  secondaryText: { fontSize: 17, fontWeight: '800' },
});
