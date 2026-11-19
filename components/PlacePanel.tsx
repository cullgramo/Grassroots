import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useApp } from '@/context/AppContext';
import { COUNTIES } from '@/data/counties';
import { BottomPanel } from './BottomPanel';
import { Chip } from './Chip';
import { useTheme } from './useTheme';

const DISTANCES = [5, 10, 25, 50, 100];

/** Choose where to look: within a distance of you, one county, or the whole island. The map moves to match. */
export function PlacePanel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const { filters, location, requestLocation, choosePlace } = useApp();
  const [asking, setAsking] = useState(false);
  const near = !filters.county && filters.distanceKm != null && location != null;
  const everywhere = !filters.county && !near;
  const pick = (place: { county: string | null; distanceKm: number | null }) => {
    choosePlace(place);
    onClose();
  };

  return (
    <BottomPanel visible={visible} title="Where?" onClose={onClose}>
      <Text style={[styles.heading, { color: t.muted }]}>NEAR ME</Text>
      {location ? (
        <View style={styles.chips}>
          {DISTANCES.map((d) => (
            <Chip key={d} label={`${d} km`} selected={near && filters.distanceKm === d} onPress={() => pick({ county: null, distanceKm: d })} />
          ))}
        </View>
      ) : (
        <View style={styles.chips}>
          <Text style={[styles.note, { color: t.muted }]}>Location is off, so distances from you cannot be worked out.</Text>
          <Chip
            label={asking ? 'Finding you…' : 'Use my location'}
            onPress={async () => {
              setAsking(true);
              await requestLocation();
              setAsking(false);
            }}
          />
        </View>
      )}

      <Text style={[styles.heading, { color: t.muted }]}>EVERYWHERE</Text>
      <View style={styles.chips}>
        <Chip label="All Ireland" selected={everywhere} onPress={() => pick({ county: null, distanceKm: null })} />
      </View>

      <Text style={[styles.heading, { color: t.muted }]}>ONE COUNTY</Text>
      <View style={styles.chips}>
        {COUNTIES.map((c) => (
          <Chip key={c} label={c} selected={filters.county === c} onPress={() => pick({ county: c, distanceKm: null })} />
        ))}
      </View>
    </BottomPanel>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginTop: 12, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  note: { fontSize: 14, flexBasis: '100%' },
});
