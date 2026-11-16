// Leaflet works out its size once, when it starts. If the page holding the map is hidden (another screen is on top)
// the map's box shrinks to nothing, and when it comes back Leaflet still believes it is that size: grey tiles, and
// map bounds that cover no ground, so every fixture looks off screen. These helpers re-measure and re-read the bounds.

type SizedMap = { invalidateSize: (animate?: boolean) => unknown };

/** True once the map's box has a real size (it is on screen). */
export function hasSize(el: { clientWidth: number; clientHeight: number } | null | undefined): boolean {
  return !!el && el.clientWidth > 0 && el.clientHeight > 0;
}

/** Re-measures the map and reports its bounds again. Does nothing while the map is hidden. */
export function refreshMap(
  map: SizedMap | null | undefined,
  el: { clientWidth: number; clientHeight: number } | null | undefined,
  report: () => void
): boolean {
  if (!map || !hasSize(el)) return false;
  map.invalidateSize(false);
  report();
  return true;
}
