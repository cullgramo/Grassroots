import { getTileSource } from '../mapTiles';

describe('getTileSource', () => {
  it('uses MapTiler Streets 512px tiles with attribution when a key is set', () => {
    const t = getTileSource('abc 123');
    expect(t.url).toBe('https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=abc%20123');
    expect(t.options).toMatchObject({ tileSize: 512, zoomOffset: -1 });
    expect(t.options.attribution).toContain('https://www.maptiler.com/copyright/');
    expect(t.options.attribution).toContain('https://www.openstreetmap.org/copyright');
  });
  it.each([null, undefined, ''])('falls back to OpenStreetMap when the key is %p', (key) => {
    const t = getTileSource(key);
    expect(t.url).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(t.options.attribution).toContain('OpenStreetMap contributors');
    expect(t.options.attribution).not.toContain('MapTiler');
  });
});
