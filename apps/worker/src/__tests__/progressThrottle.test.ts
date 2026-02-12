import { describe, it, expect } from 'vitest';
import { ProgressThrottle } from '../utils/progressThrottle.js';

describe('ProgressThrottle', () => {
  function createThrottle(startTime = 0) {
    let time = startTime;
    const advance = (ms: number) => { time += ms; };
    const throttle = new ProgressThrottle({ now: () => time });
    return { throttle, advance };
  }

  it('allows the very first write unconditionally', () => {
    const { throttle } = createThrottle();
    expect(throttle.shouldWrite(10)).toBe(true);
  });

  it('blocks writes when delta and time are below thresholds', () => {
    const { throttle, advance } = createThrottle();
    throttle.shouldWrite(10); // first write -- allowed

    advance(500); // only 500ms, delta=2 (<5)
    expect(throttle.shouldWrite(12)).toBe(false);
  });

  it('allows write when progress delta >= 5 points', () => {
    const { throttle, advance } = createThrottle();
    throttle.shouldWrite(10); // first write

    advance(100); // short time, but delta=5
    expect(throttle.shouldWrite(15)).toBe(true);
  });

  it('allows write when >= 3 seconds have elapsed even with small delta', () => {
    const { throttle, advance } = createThrottle();
    throttle.shouldWrite(10); // first write

    advance(3000); // 3 seconds, delta=1
    expect(throttle.shouldWrite(11)).toBe(true);
  });

  it('always allows progress = 100 (final state)', () => {
    const { throttle } = createThrottle();
    throttle.shouldWrite(98); // first write

    // No time elapsed, only 2-point delta -- would normally be blocked
    expect(throttle.shouldWrite(100)).toBe(true);
  });

  it('always allows progress > 100 (treated as completion)', () => {
    const { throttle } = createThrottle();
    throttle.shouldWrite(95);
    expect(throttle.shouldWrite(105)).toBe(true);
  });

  it('resets tracking after each allowed write', () => {
    const { throttle, advance } = createThrottle();
    throttle.shouldWrite(10); // first write, recorded at t=0

    advance(3000);
    expect(throttle.shouldWrite(12)).toBe(true); // allowed (3s elapsed), recorded at t=3000

    // Now the clock and last-progress are reset to t=3000, progress=12
    advance(500); // t=3500, delta=1 from last write (12)
    expect(throttle.shouldWrite(13)).toBe(false);

    advance(2500); // t=6000 (3s from last write at t=3000)
    expect(throttle.shouldWrite(14)).toBe(true);
  });

  it('supports custom minDelta and minIntervalMs', () => {
    let time = 0;
    const throttle = new ProgressThrottle({
      minDelta: 10,
      minIntervalMs: 5000,
      now: () => time,
    });

    throttle.shouldWrite(0); // first write

    time += 1000; // 1s, delta=8 -- below 10
    expect(throttle.shouldWrite(8)).toBe(false);

    time += 1000; // 2s, delta=10 -- exactly 10
    expect(throttle.shouldWrite(10)).toBe(true);
  });

  it('handles the typical scan progression sequence', () => {
    const { throttle, advance } = createThrottle();
    const writes: number[] = [];

    // Simulate the scan progression: 10, 20, 30, 34, 38, 42, ..., 70, 75, 90, 100
    const values = [10, 20, 30, 34, 38, 42, 46, 50, 54, 58, 62, 66, 70, 75, 90, 100];

    for (const v of values) {
      advance(200); // ~200ms between each call
      if (throttle.shouldWrite(v)) {
        writes.push(v);
      }
    }

    // First write (10) is always allowed.
    // 20 is +10 from 10, allowed.
    // 30 is +10 from 20, allowed.
    // 34 is +4, blocked.
    // 38 is +8 from 30, allowed.
    // 42 is +4, blocked.
    // 46 is +8 from 38, allowed.
    // etc...
    // 100 is always allowed.
    expect(writes[0]).toBe(10);
    expect(writes).toContain(100);
    // Significantly fewer than the 16 input values
    expect(writes.length).toBeLessThan(values.length);
  });

  it('handles repeated same-value calls without writing', () => {
    const { throttle, advance } = createThrottle();
    throttle.shouldWrite(30); // first write

    advance(100);
    expect(throttle.shouldWrite(30)).toBe(false); // same value, short time
    advance(100);
    expect(throttle.shouldWrite(30)).toBe(false);
  });

  it('allows write for repeated same-value after time threshold', () => {
    const { throttle, advance } = createThrottle();
    throttle.shouldWrite(30);

    advance(3000);
    expect(throttle.shouldWrite(30)).toBe(true); // 3s elapsed
  });

  it('uses Date.now by default when no now function provided', () => {
    const throttle = new ProgressThrottle();
    // Just verify it works without error
    expect(throttle.shouldWrite(10)).toBe(true);
    expect(throttle.shouldWrite(11)).toBe(false);
    expect(throttle.shouldWrite(100)).toBe(true);
  });
});
