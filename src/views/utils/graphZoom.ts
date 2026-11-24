export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;
export type ChartTransform = { scale: number; x: number; y: number };
export type ChartSize = { width: number; height: number };
export const initialTransform: ChartTransform = { scale: MIN_ZOOM, x: 0, y: 0 };

export function constrainChart(transform: ChartTransform, size: ChartSize): ChartTransform {
  const scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, transform.scale));
  if (scale === MIN_ZOOM) return initialTransform;
  const limitX = (size.width * (scale - 1)) / 2;
  const limitY = (size.height * (scale - 1)) / 2;
  return {
    scale,
    x: Math.max(-limitX, Math.min(limitX, transform.x)),
    y: Math.max(-limitY, Math.min(limitY, transform.y)),
  };
}

export function scaleChart(
  current: ChartTransform,
  target: number,
  size: ChartSize,
  offset = { x: 0, y: 0 },
): ChartTransform {
  const scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, target));
  const ratio = scale / current.scale;
  return constrainChart(
    { scale, x: current.x * ratio + offset.x, y: current.y * ratio + offset.y },
    size,
  );
}
