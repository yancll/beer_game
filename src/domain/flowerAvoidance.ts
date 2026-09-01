export interface Point {
  x: number;
  y: number;
}

export interface CircleProjection extends Point {
  normalX: number;
  normalY: number;
  displaced: boolean;
}

export function projectOutsideCircle(
  position: Point,
  center: Point,
  minimumDistance: number,
  fallbackAngle = 0,
): CircleProjection {
  const deltaX = position.x - center.x;
  const deltaY = position.y - center.y;
  const distance = Math.hypot(deltaX, deltaY);
  const normalX = distance > 0 ? deltaX / distance : Math.cos(fallbackAngle);
  const normalY = distance > 0 ? deltaY / distance : Math.sin(fallbackAngle);

  if (distance >= minimumDistance) {
    return { ...position, normalX, normalY, displaced: false };
  }

  return {
    x: center.x + normalX * minimumDistance,
    y: center.y + normalY * minimumDistance,
    normalX,
    normalY,
    displaced: true,
  };
}
