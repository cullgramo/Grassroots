import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from './useTheme';

export type Snap = 'peek' | 'half' | 'full';
const ORDER: Snap[] = ['peek', 'half', 'full'];

interface SheetProps {
  /** Height of the area the sheet lives in. */
  height: number;
  /** Space kept clear above the sheet when fully open. */
  topOffset: number;
  peekHeight: number;
  snap: Snap;
  onSnap: (snap: Snap) => void;
  header: ReactNode;
  /** Receives the height hidden below the screen edge, to pad scrolling content. */
  children: (hiddenHeight: number) => ReactNode;
}

/** Draggable bottom sheet. Drag or tap the header to move between peek, half and full. */
export function Sheet({ height, topOffset, peekHeight, snap, onSnap, header, children }: SheetProps) {
  const t = useTheme();
  const full = height - topOffset;
  const offsets = useMemo(
    () => ({ full: 0, half: Math.max(full - height * 0.5, 0), peek: Math.max(full - peekHeight, 0) }),
    [full, height, peekHeight]
  );
  const [y] = useState(() => new Animated.Value(offsets[snap]));
  const latest = useRef({ offsets, snap, onSnap });
  useEffect(() => {
    latest.current = { offsets, snap, onSnap };
  });

  useEffect(() => {
    Animated.spring(y, { toValue: offsets[snap], useNativeDriver: true, bounciness: 2, speed: 16 }).start();
  }, [snap, offsets, y]);

  // The handlers run on touch, not during render, so reading the ref here is safe.
  /* eslint-disable react-hooks/refs */
  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        const { offsets: o, snap: s } = latest.current;
        y.setValue(Math.min(Math.max(o[s] + g.dy, 0), o.peek));
      },
      onPanResponderRelease: (_, g) => {
        const { offsets: o, snap: s, onSnap: done } = latest.current;
        const at = o[s] + g.dy + g.vy * 120;
        const next = ORDER.reduce((best, k) => (Math.abs(o[k] - at) < Math.abs(o[best] - at) ? k : best), s);
        if (next === s) Animated.spring(y, { toValue: o[s], useNativeDriver: true, bounciness: 2 }).start();
        else done(next);
      },
    })
  );
  /* eslint-enable react-hooks/refs */

  if (height <= 0) return null;

  return (
    <Animated.View
      style={[styles.sheet, { top: topOffset, height: full, backgroundColor: t.card, transform: [{ translateY: y }] }]}>
      <View {...pan.panHandlers}>
        <Pressable
          onPress={() => onSnap(snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'peek')}
          accessibilityRole="button"
          accessibilityLabel={snap === 'full' ? 'Collapse list' : 'Expand list'}>
          <View style={[styles.grabber, { backgroundColor: t.border }]} />
          {header}
        </Pressable>
      </View>
      {children(offsets[snap])}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -3 },
    elevation: 12,
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginTop: 8 },
});
