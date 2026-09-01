import { describe, expect, it } from 'vitest';
import {
  createGenome,
  evolvePopulation,
  mutateGenome,
  scoreEvaluation,
  type BeeEvaluation,
  type BeeGenome,
} from './evolution';

const middleRandom = () => 0.5;
const lowGenome: BeeGenome = {
  directness: 0.4,
  exploration: 0.6,
  inertia: 0.5,
  sensorNoise: 0.7,
};

function evaluation(id: string, harvestProgress: number, closestDistance = 100): BeeEvaluation {
  return {
    id,
    genome: lowGenome,
    closestDistance,
    pathDistance: 200,
    harvestProgress,
  };
}

describe('evolutionary steering', () => {
  it('creates more precise baseline genomes at higher intelligence', () => {
    const normal = createGenome(0, middleRandom);
    const expert = createGenome(5, middleRandom);
    expect(expert.directness).toBeGreaterThan(normal.directness);
    expect(expert.sensorNoise).toBeLessThan(normal.sensorNoise);
    expect(expert.exploration).toBeLessThan(normal.exploration);
  });

  it('keeps every generated parameter within its safe range', () => {
    const extremes = [createGenome(0, () => 0), createGenome(5, () => 1)];
    extremes.forEach((genome) => {
      Object.values(genome).forEach((value) => expect(value).toBeGreaterThanOrEqual(0));
      Object.values(genome).forEach((value) => expect(value).toBeLessThanOrEqual(1));
    });
  });

  it('rewards harvesting and proximity while penalizing wasted travel', () => {
    const successful = scoreEvaluation(evaluation('winner', 0.8, 20));
    const wandering = scoreEvaluation({ ...evaluation('wanderer', 0, 500), pathDistance: 900 });
    expect(successful).toBeGreaterThan(wandering);
  });

  it('mutates toward the intelligence baseline without leaving bounds', () => {
    const mutated = mutateGenome(lowGenome, 5, middleRandom);
    expect(mutated.directness).toBeGreaterThan(lowGenome.directness);
    Object.values(mutated).forEach((value) => expect(value).toBeGreaterThanOrEqual(0));
    Object.values(mutated).forEach((value) => expect(value).toBeLessThanOrEqual(1));
  });

  it('keeps an elite and breeds weaker bees from the best performers', () => {
    const population = [evaluation('elite', 1), evaluation('second', 0.5), evaluation('weak', 0)];
    const evolved = evolvePopulation(population, 3, middleRandom);
    expect(evolved).toHaveLength(3);
    expect(evolved.find((item) => item.id === 'elite')?.genome).toEqual(lowGenome);
    expect(evolved.find((item) => item.id === 'weak')?.genome).not.toBe(lowGenome);
  });

  it('supports empty and one-bee colonies', () => {
    expect(evolvePopulation([], 0, middleRandom)).toEqual([]);
    const evolved = evolvePopulation([evaluation('solo', 0.2)], 0, middleRandom);
    expect(evolved).toHaveLength(1);
    expect(evolved[0].id).toBe('solo');
  });
});
