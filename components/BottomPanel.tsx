import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from './useTheme';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A panel that slides over the bottom of the screen for one quick choice (a sport, a place, a date), so the map stays
 * in sight behind it. Tapping outside it, or the X, closes it without changing anything.
 */
export function BottomPanel({ visible, title, onClose, children }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.fill}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel={`Close ${title}`} />
        <View style={[styles.panel, { backgroundColor: t.background, paddingBottom: insets.bottom + 12 }]} accessibilityViewIsModal>
          <View style={styles.head}>
            <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">{title}</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={10}
              style={[styles.close, { backgroundColor: t.card, borderColor: t.border }]}>
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} tintColor={t.text} size={18} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(15,23,42,0.45)' },
  panel: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '84%' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: '800' },
  close: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, paddingBottom: 8 },
});
