// Tile source for the web (Leaflet) map: MapTiler Streets when a key is set, OpenStreetMap otherwise.
export const MAPTILER_ATTRIBUTION =
  '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">&copy; MapTiler</a> ' +
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">&copy; OpenStreetMap contributors</a>';
export const OSM_ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">&copy; OpenStreetMap contributors</a>';

export type TileSource = {
  url: string;
  options: { maxZoom: number; attribution: string; tileSize?: number; zoomOffset?: number; crossOrigin?: boolean };
};

export function getTileSource(key: string | null | undefined): TileSource {
  if (!key) {
    return { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', options: { maxZoom: 19, attribution: OSM_ATTRIBUTION } };
  }
  // 512px tiles shown at zoomOffset -1 are the same map at the same scale but with twice the pixels, so they stay sharp on retina screens.
  return {
    url: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`,
    options: { maxZoom: 22, tileSize: 512, zoomOffset: -1, crossOrigin: true, attribution: MAPTILER_ATTRIBUTION },
  };
}
