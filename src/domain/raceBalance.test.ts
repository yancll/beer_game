import { describe, expect, it } from 'vitest';
import {
  discoveryWindowMs,
  EXPERT_DISCOVERY_MAX_MS,
  EXPERT_DISCOVERY_MIN_MS,
  REFERENCE_EXPERT_BEE_COUNT,
  sampleDiscoveryDelayMs,
} from './raceBalance';

describe('race duration balance', () => {
  it('keeps expert bees in the calibrated three-to-five-minute discovery window', () => {
    expect(discoveryWindowMs(5)).toEqual({
      minMs: EXPERT_DISCOVERY_MIN_MS,
      maxMs: EXPERT_DISCOVERY_MAX_MS,
    });
    expect(REFERENCE_EXPERT_BEE_COUNT).toBe(50);
  });

  it('places the expected first discovery for fifty expert bees inside three-to-six minutes', () => {
    const expectedFirstDiscovery = EXPERT_DISCOVERY_MIN_MS +
      (EXPERT_DISCOVERY_MAX_MS - EXPERT_DISCOVERY_MIN_MS) /
        (REFERENCE_EXPERT_BEE_COUNT + 1);
    expect(expectedFirstDiscovery).toBeGreaterThanOrEqual(3 * 60 * 1000);
    expect(expectedFirstDiscovery).toBeLessThanOrEqual(6 * 60 * 1000);
  });

  it('makes higher intelligence discover the target sooner for the same sample', () => {
    expect(sampleDiscoveryDelayMs(5, () => 0.5)).toBeLessThan(
      sampleDiscoveryDelayMs(0, () => 0.5),
    );
  });

  it('clamps random samples to the configured bounds', () => {
    expect(sampleDiscoveryDelayMs(5, () => -1)).toBe(EXPERT_DISCOVERY_MIN_MS);
    expect(sampleDiscoveryDelayMs(5, () => 2)).toBe(EXPERT_DISCOVERY_MAX_MS);
  });
});
