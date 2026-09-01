import { describe, expect, it } from 'vitest';
import { projectOutsideCircle } from './flowerAvoidance';

describe('flower avoidance', () => {
  it('leaves a searching bee unchanged outside the protected area', () => {
    expect(projectOutsideCircle({ x: 60, y: 0 }, { x: 0, y: 0 }, 46)).toMatchObject({
      x: 60,
      y: 0,
      displaced: false,
    });
  });

  it('projects a searching bee to the edge instead of letting it cross the flower', () => {
    expect(projectOutsideCircle({ x: 10, y: 0 }, { x: 0, y: 0 }, 46)).toMatchObject({
      x: 46,
      y: 0,
      normalX: 1,
      normalY: 0,
      displaced: true,
    });
  });

  it('uses a stable direction when the bee is exactly over the flower', () => {
    const projected = projectOutsideCircle({ x: 5, y: 5 }, { x: 5, y: 5 }, 46, Math.PI / 2);
    expect(projected.x).toBeCloseTo(5);
    expect(projected.y).toBeCloseTo(51);
    expect(projected.displaced).toBe(true);
  });
});
