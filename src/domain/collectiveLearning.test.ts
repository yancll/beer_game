import { describe, expect, it } from 'vitest';
import {
  collectiveLearningProfile,
  selectCollectiveSignal,
  type BeeSignalSample,
} from './collectiveLearning';

const samples: BeeSignalSample[] = [
  { id: 'bee-a', x: 120, y: 80, distance: 105 },
  { id: 'bee-b', x: 240, y: 160, distance: 170 },
  { id: 'bee-c', x: 320, y: 200, distance: 260 },
];

describe('collective learning', () => {
  it('increases signal reach and attraction with intelligence', () => {
    const novice = collectiveLearningProfile(0);
    const expert = collectiveLearningProfile(5);

    expect(expert.sensingRadius).toBeGreaterThan(novice.sensingRadius);
    expect(expert.baseStrength).toBeGreaterThan(novice.baseStrength);
  });

  it('shares the closest scout position with the rest of its colony', () => {
    expect(selectCollectiveSignal(samples, 5)).toMatchObject({
      guideId: 'bee-a',
      targetX: 120,
      targetY: 80,
    });
  });

  it('does not reveal a distant flower or create a signal for one bee', () => {
    expect(selectCollectiveSignal(samples.map((sample) => ({ ...sample, distance: 400 })), 5))
      .toBeUndefined();
    expect(selectCollectiveSignal([samples[0]], 5)).toBeUndefined();
  });

  it('keeps the current guide until another scout is clearly better', () => {
    expect(selectCollectiveSignal(samples, 5, 'bee-b')?.guideId).toBe('bee-a');
    expect(selectCollectiveSignal([
      { ...samples[0], distance: 105 },
      { ...samples[1], distance: 116 },
      samples[2],
    ], 5, 'bee-b')?.guideId).toBe('bee-b');
  });
});
