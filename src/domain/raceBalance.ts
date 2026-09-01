import type { IntelligenceLevel } from './types';

export const REFERENCE_EXPERT_BEE_COUNT = 50;
export const EXPERT_DISCOVERY_MIN_MS = 5 * 60 * 1000;
export const EXPERT_DISCOVERY_MAX_MS = 9 * 60 * 1000;

interface DiscoveryWindow {
  minMs: number;
  maxMs: number;
}

export function discoveryWindowMs(intelligence: IntelligenceLevel): DiscoveryWindow {
  const skill = intelligence / 5;
  return {
    minMs: Math.round((7 - skill * 2) * 60 * 1000),
    maxMs: Math.round((12 - skill * 3) * 60 * 1000),
  };
}

export function sampleDiscoveryDelayMs(
  intelligence: IntelligenceLevel,
  random: () => number = Math.random,
): number {
  const window = discoveryWindowMs(intelligence);
  const sample = Math.max(0, Math.min(1, random()));
  return Math.round(window.minMs + (window.maxMs - window.minMs) * sample);
}
