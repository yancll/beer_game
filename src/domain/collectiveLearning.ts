import type { IntelligenceLevel } from './types';

export interface BeeSignalSample {
  id: string;
  x: number;
  y: number;
  distance: number;
}

export interface CollectiveSignal {
  guideId: string;
  targetX: number;
  targetY: number;
  strength: number;
  sensingRadius: number;
}

const GUIDE_SWITCH_MARGIN = 18;

export function collectiveLearningProfile(intelligence: IntelligenceLevel) {
  const skill = intelligence / 5;
  return {
    sensingRadius: 140 + skill * 150,
    baseStrength: 0.24 + skill * 0.54,
  };
}

export function selectCollectiveSignal(
  samples: readonly BeeSignalSample[],
  intelligence: IntelligenceLevel,
  previousGuideId?: string,
): CollectiveSignal | undefined {
  if (samples.length < 2) return undefined;

  const profile = collectiveLearningProfile(intelligence);
  const closest = samples.reduce((best, sample) =>
    sample.distance < best.distance ? sample : best,
  );
  if (closest.distance > profile.sensingRadius) return undefined;

  const previousGuide = samples.find((sample) => sample.id === previousGuideId);
  const guide = previousGuide &&
    previousGuide.distance <= profile.sensingRadius &&
    previousGuide.distance <= closest.distance + GUIDE_SWITCH_MARGIN
    ? previousGuide
    : closest;
  const proximity = 1 - guide.distance / profile.sensingRadius;

  return {
    guideId: guide.id,
    targetX: guide.x,
    targetY: guide.y,
    strength: Math.min(0.92, profile.baseStrength + proximity * 0.14),
    sensingRadius: profile.sensingRadius,
  };
}
