import { flushMove, hasSize, refreshMap, whenSized } from '../mapRefresh';

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

describe('whenSized', () => {
  const hidden = { clientWidth: 0, clientHeight: 0 };
  const shown = { clientWidth: 390, clientHeight: 795 };

  it('runs the move immediately when the map is on screen', () => {
    const held = { current: null as (() => void) | null };
    const move = jest.fn();
    whenSized(shown, held, move);
    expect(move).toHaveBeenCalledTimes(1);
    expect(held.current).toBeNull();
  });

  it('holds the latest move while the map is hidden, and flush runs it once it is shown', () => {
    const held = { current: null as (() => void) | null };
    const first = jest.fn();
    const second = jest.fn();
    whenSized(hidden, held, first);
    whenSized(hidden, held, second);
    flushMove(hidden, held);
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    flushMove(shown, held);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    flushMove(shown, held);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('a move on a visible map drops one that was waiting', () => {
    const held = { current: null as (() => void) | null };
    const waiting = jest.fn();
    const now = jest.fn();
    whenSized(hidden, held, waiting);
    whenSized(shown, held, now);
    expect(waiting).not.toHaveBeenCalled();
    expect(now).toHaveBeenCalledTimes(1);
    expect(held.current).toBeNull();
  });
});
