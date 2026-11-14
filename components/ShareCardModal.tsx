import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View, type HostInstance } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import type { Fixture } from '@/types/fixture';
import { FixtureShareCard } from './FixtureShareCard';
import { useTheme } from './useTheme';

/** Shows the fixture card and sends it as a picture to any app (WhatsApp, Instagram, Messenger, Photos, AirDrop…). */
export function ShareCardModal({ fixture, visible, onClose }: { fixture: Fixture; visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const cardRef = useRef<HostInstance>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const share = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setError('Sharing a picture is not available on this device.');
        return;
      }
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share this fixture' });
    } catch {
      setError('Could not make the picture. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.center}>
          <FixtureShareCard ref={cardRef} fixture={fixture} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            onPress={share}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Share this card as a picture"
            style={[styles.primary, { backgroundColor: t.tint, opacity: busy ? 0.7 : 1 }]}>
            {busy ? <ActivityIndicator color={t.onTint} /> : <Text style={[styles.primaryText, { color: t.onTint }]}>Share picture</Text>}
          </Pressable>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', alignItems: 'center' },
  center: { alignItems: 'center', gap: 14 },
  primary: { minHeight: 52, minWidth: 240, borderRadius: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  primaryText: { fontSize: 17, fontWeight: '800' },
  close: { minHeight: 44, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  error: { color: '#fecaca', fontSize: 14, textAlign: 'center', maxWidth: 300 },
});
