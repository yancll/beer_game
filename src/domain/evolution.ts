import type { IntelligenceLevel } from './types';

export interface BeeGenome {
  directness: number;
  exploration: number;
  inertia: number;
  sensorNoise: number;
}

export interface BeeEvaluation {
  id: string;
  genome: BeeGenome;
  closestDistance: number;
  pathDistance: number;
  harvestProgress: number;
}

export interface EvolvedGenome {
  id: string;
  genome: BeeGenome;
}

type RandomSource = () => number;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const jitter = (random: RandomSource) => random() * 2 - 1;

export function createGenome(
  intelligence: IntelligenceLevel,
  random: RandomSource = Math.random,
): BeeGenome {
  const skill = intelligence / 5;
  return {
    directness: clamp01(0.42 + skill * 0.5 + jitter(random) * 0.035),
    exploration: clamp01(0.52 - skill * 0.32 + jitter(random) * 0.05),
    inertia: clamp01(0.52 + skill * 0.28 + jitter(random) * 0.035),
    sensorNoise: clamp01(0.7 - skill * 0.62 + jitter(random) * 0.04),
  };
}

export function scoreEvaluation(evaluation: BeeEvaluation): number {
  return (
    evaluation.harvestProgress * 150 +
    Math.max(0, 900 - evaluation.closestDistance) * 0.16 -
    evaluation.pathDistance * 0.012
  );
}

export function mutateGenome(
  parent: BeeGenome,
  intelligence: IntelligenceLevel,
  random: RandomSource = Math.random,
): BeeGenome {
  const mutationSize = 0.13 - intelligence * 0.012;
  const baseline = createGenome(intelligence, random);
  const mutate = (value: number, target: number) =>
    clamp01(value * 0.78 + target * 0.22 + jitter(random) * mutationSize);

  return {
    directness: mutate(parent.directness, baseline.directness),
    exploration: mutate(parent.exploration, baseline.exploration),
    inertia: mutate(parent.inertia, baseline.inertia),
    sensorNoise: mutate(parent.sensorNoise, baseline.sensorNoise),
  };
}

export function evolvePopulation(
  evaluations: readonly BeeEvaluation[],
  intelligence: IntelligenceLevel,
  random: RandomSource = Math.random,
): EvolvedGenome[] {
  if (evaluations.length === 0) return [];
  const ranked = [...evaluations].sort((a, b) => scoreEvaluation(b) - scoreEvaluation(a));
  const eliteCount = Math.max(1, Math.ceil(ranked.length * 0.4));
  const elites = ranked.slice(0, eliteCount);

  return ranked.map((evaluation, index) => {
    if (index < eliteCount && ranked.length > 1) {
      return { id: evaluation.id, genome: { ...evaluation.genome } };
    }
    const parent = elites[Math.floor(random() * elites.length)] ?? elites[0];
    return { id: evaluation.id, genome: mutateGenome(parent.genome, intelligence, random) };
  });
}
