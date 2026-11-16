import { hasSize, refreshMap } from '../mapRefresh';

describe('refreshMap', () => {
  it('re-measures the map and reports bounds when it has a size', () => {
    const map = { invalidateSize: jest.fn() };
    const report = jest.fn();
    expect(refreshMap(map, { clientWidth: 800, clientHeight: 600 }, report)).toBe(true);
    expect(map.invalidateSize).toHaveBeenCalledWith(false);
    expect(report).toHaveBeenCalledTimes(1);
    expect(map.invalidateSize.mock.invocationCallOrder[0]).toBeLessThan(report.mock.invocationCallOrder[0]);
  });

  it('does nothing while the map is hidden (zero size)', () => {
    const map = { invalidateSize: jest.fn() };
    const report = jest.fn();
    expect(refreshMap(map, { clientWidth: 0, clientHeight: 0 }, report)).toBe(false);
    expect(map.invalidateSize).not.toHaveBeenCalled();
    expect(report).not.toHaveBeenCalled();
  });

  it('does nothing before the map exists', () => {
    const report = jest.fn();
    expect(refreshMap(null, { clientWidth: 10, clientHeight: 10 }, report)).toBe(false);
    expect(report).not.toHaveBeenCalled();
  });

  it('hasSize needs both width and height', () => {
    expect(hasSize({ clientWidth: 10, clientHeight: 0 })).toBe(false);
    expect(hasSize(null)).toBe(false);
  });
});
