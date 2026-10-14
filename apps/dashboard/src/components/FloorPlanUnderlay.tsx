'use client';

import type { CSSProperties } from 'react';
import {
  FLOOR_PLAN_DEFAULT_BACKGROUND_FIT,
  FLOOR_PLAN_DEFAULT_BACKGROUND_SCALE,
  type FloorPlanBackgroundFit,
} from '@reservations/shared';

type FloorPlanUnderlayProps = {
  url: string;
  fit?: FloorPlanBackgroundFit | null;
  scale?: number | null;
  rotationDeg?: number | null;
  /** Used when fit is `tile` to size one pattern cell in px. */
  cellSize?: number;
  style?: CSSProperties;
};

/** Safe `url("...")` for CSS background-image. */
export function cssBackgroundUrl(url: string) {
  return `url(${JSON.stringify(url)})`;
}

/**
 * Floor-plan underlay image layer: free scale + rotation, not locked to grid cover.
 * Sits behind tables/fixtures; grid lines stay on the parent.
 */
export function FloorPlanUnderlay({
  url,
  fit,
  scale,
  rotationDeg,
  cellSize = 40,
  style,
}: FloorPlanUnderlayProps) {
  const resolvedFit = fit ?? FLOOR_PLAN_DEFAULT_BACKGROUND_FIT;
  const resolvedScale =
    typeof scale === 'number' && Number.isFinite(scale) && scale > 0
      ? scale
      : FLOOR_PLAN_DEFAULT_BACKGROUND_SCALE;
  const rot =
    typeof rotationDeg === 'number' && Number.isFinite(rotationDeg) ? rotationDeg : 0;

  const tilePx = Math.max(16, cellSize * 4 * resolvedScale);
  const layerPct = Math.max(resolvedScale, 0.25) * 100;

  let backgroundSize: string;
  if (resolvedFit === 'tile') backgroundSize = `${tilePx}px`;
  else if (resolvedFit === 'stretch') backgroundSize = '100% 100%';
  else backgroundSize = resolvedFit; // cover | contain

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        zIndex: 0,
        pointerEvents: 'none',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          // Oversized so rotation does not clip corners; scale zooms independently of the grid.
          width: resolvedFit === 'tile' ? '200%' : `${layerPct}%`,
          height: resolvedFit === 'tile' ? '200%' : `${layerPct}%`,
          transform: `translate(-50%, -50%) rotate(${rot}deg)`,
          backgroundImage: cssBackgroundUrl(url),
          backgroundRepeat: resolvedFit === 'tile' ? 'repeat' : 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize,
        }}
      />
    </div>
  );
}
