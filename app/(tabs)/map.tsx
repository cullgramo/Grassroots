import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Map</Text>
      <Text style={styles.subtitle}>The fixture map will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 15, marginTop: 8, opacity: 0.7, textAlign: 'center' },
});
