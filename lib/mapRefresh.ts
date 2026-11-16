// Leaflet works out its size once, when it starts. If the page holding the map is hidden (another screen is on top)
// the map's box shrinks to nothing, and when it comes back Leaflet still believes it is that size: grey tiles, and
// map bounds that cover no ground, so every fixture looks off screen. These helpers re-measure and re-read the bounds.
// Re-measuring does not undo a zoom worked out while the box had no size: fitBounds treats a zero size as zoom 0.
// Hold that move with whenSized and run it from flushMove once the box is back.

type SizedMap = { invalidateSize: (animate?: boolean) => unknown };
type Box = { clientWidth: number; clientHeight: number } | null | undefined;

/** A move kept by whenSized until the map is on screen. */
export type HeldMove = { current: (() => void) | null };

/** True once the map's box has a real size (it is on screen). */
export function hasSize(el: Box): boolean {
  return !!el && el.clientWidth > 0 && el.clientHeight > 0;
}

/**
 * Runs `move` when the map is on screen. While it is hidden, keeps the latest `move` and does not run it,
 * so a fit cannot clamp the zoom. A later call replaces the one still waiting.
 */
export function whenSized(el: Box, held: HeldMove, move: () => void): void {
  if (!hasSize(el)) {
    held.current = move;
    return;
  }
  held.current = null;
  move();
}

/** Runs the move kept by whenSized, once the map is on screen. Does nothing while it is still hidden. */
export function flushMove(el: Box, held: HeldMove): void {
  const move = held.current;
  if (!move || !hasSize(el)) return;
  held.current = null;
  move();
}

/** Re-measures the map and reports its bounds again. Does nothing while the map is hidden. */
export function refreshMap(
  map: SizedMap | null | undefined,
  el: Box,
  report: () => void
): boolean {
  if (!map || !hasSize(el)) return false;
  map.invalidateSize(false);
  report();
  return true;
}
