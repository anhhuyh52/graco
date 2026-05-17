/**
 * CurveInteractions.ts
 *
 * Pure interaction engine for curve point dragging.
 * No DOM reads, no SolidJS signals — all pure functions.
 * Called by CurveEditor which owns the event handlers.
 */

import { clamp01 } from "../../../core/math/clamp";
import type { CurvePoint } from "../../../core/curves/types";
import type { EndpointConstraint } from "./types";
import type { CurveSemantics } from "../../../core/curves/types";

/** Minimum x-distance between adjacent points in pixel-normalized units. */
const POINT_SPACING_PX = 18;

/**
 * Get endpoint constraint rules based on curve semantics and point position.
 *
 * - exposure: endpoints locked horizontally (can move Y)
 * - contrast: endpoints fully anchored (cannot move at all)
 * - hue curves (density/radiance): free movement (cyclic continuity)
 * - others: free movement
 */
export function getEndpointConstraint(
  semantics: CurveSemantics,
  pointIndex: number,
  totalPoints: number,
  sortedIndex: number,
): EndpointConstraint {
  const isEndpoint = sortedIndex === 0 || sortedIndex === totalPoints - 1;

  if (!isEndpoint) return { lockX: false, lockY: false };

  switch (semantics) {
    case "exposure":
      return { lockX: true, lockY: false };

    case "contrast":
      return { lockX: true, lockY: true };

    case "density":
    case "radiance":
      // Cyclic curves — endpoints free but Y-linked externally
      return { lockX: false, lockY: false };

    default:
      return { lockX: false, lockY: false };
  }
}

/**
 * Compute the new position of a dragged point, respecting:
 * - canvas bounds [0, 1]
 * - minimum spacing from adjacent points
 * - endpoint constraints based on semantics
 * - axis lock modifier keys
 *
 * @param clientX       Pointer X (window coordinates)
 * @param clientY       Pointer Y (window coordinates)
 * @param offsetX       X offset from pointer to point center (for smooth grab)
 * @param offsetY       Y offset from pointer to point center (for smooth grab)
 * @param rect          Bounding rect of the curve canvas
 * @param points        All current curve points
 * @param pointIndex    Index of the point being dragged (original array index)
 * @param canvasWidth   Width of the curve canvas in pixels (for epsilon computation)
 * @param lockX         True if X movement is suppressed (Shift key)
 * @param lockY         True if Y movement is suppressed (Alt/Ctrl key)
 * @param semantics     Curve semantics for endpoint protection
 * @returns             New {x, y} position clamped and constrained
 */
export function computeDragPosition(
  clientX: number,
  clientY: number,
  offsetX: number,
  offsetY: number,
  rect: DOMRect,
  points: CurvePoint[],
  pointIndex: number,
  canvasWidth: number,
  lockX: boolean,
  lockY: boolean,
  semantics: CurveSemantics = "generic",
): { x: number; y: number } {
  const current = points[pointIndex];

  // ── Raw normalized position from pointer ──────────────────────────────────
  let nx = lockX
    ? current.x
    : clamp01((clientX - rect.left - offsetX) / rect.width);

  let ny = lockY
    ? current.y
    : clamp01(1 - (clientY - rect.top - offsetY) / rect.height);

  // ── Sort points to find sorted index ──────────────────────────────────────
  const indexed = points.map((p, i) => ({ ...p, origIndex: i }));
  const sorted = [...indexed].sort((a, b) => a.x - b.x);
  const sortedIdx = sorted.findIndex((p) => p.origIndex === pointIndex);

  // ── Endpoint constraint ────────────────────────────────────────────────────
  const constraint = getEndpointConstraint(
    semantics,
    pointIndex,
    points.length,
    sortedIdx,
  );

  if (constraint.lockX) nx = current.x;
  if (constraint.lockY) ny = current.y;

  // ── Minimum spacing constraint ─────────────────────────────────────────────
  const eps = POINT_SPACING_PX / Math.max(1, canvasWidth);

  const prevX = sortedIdx > 0 ? sorted[sortedIdx - 1].x : 0;
  const nextX = sortedIdx < sorted.length - 1 ? sorted[sortedIdx + 1].x : 1;

  nx = Math.max(prevX + eps, Math.min(nextX - eps, nx));

  return { x: nx, y: ny };
}

/**
 * Compute the grab offset — the distance from the pointer to the
 * point center at the start of a drag. Preserves position continuity.
 */
export function computeGrabOffset(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  point: CurvePoint,
): { offsetX: number; offsetY: number } {
  return {
    offsetX: clientX - (rect.left + point.x * rect.width),
    offsetY: clientY - (rect.top + (1 - point.y) * rect.height),
  };
}
