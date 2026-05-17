/**
 * Curve evaluation engine using monotone cubic Hermite interpolation.
 *
 * This replaces the natural cubic spline and Bezier approximation
 * previously mixed into Sidebar.tsx. It is:
 * - Monotone: no overshoot between control points
 * - Local: each segment only affected by adjacent points
 * - Stable: no oscillation in highlights or shadows
 * - C1 continuous: smooth first derivatives everywhere
 */

import { clamp01 } from "../math/clamp";
import type { CurvePoint } from "./types";
import {
  createCurveEvaluatorNormalized,
  normalizeCurvePoints,
} from "./curveEvaluator";

/** Normalize and sort points, removing duplicates too close in x. */
export function normalizePoints(points: CurvePoint[]): CurvePoint[] {
  return normalizeCurvePoints(points)
    .map((p) => ({
      x: clamp01(p.x),
      y: clamp01(p.y),
      tangentMode: p.tangentMode ?? "auto",
    }))
    .filter((p, i, arr) => {
      const next = arr[i + 1];
      return !next || Math.abs(p.x - next.x) > 0.0001;
    });
}

/**
 * Evaluate a monotone Hermite curve at position x ∈ [0, 1].
 *
 * @param inputPoints  Raw control points (will be normalized internally)
 * @param x            Query position ∈ [0, 1]
 * @returns            Curve value ∈ [0, 1]
 */
export function evaluateCurve(inputPoints: CurvePoint[], x: number): number {
  const points = normalizePoints(inputPoints);

  if (points.length === 0) return 0.5;
  if (points.length === 1) return points[0].y;

  const evalFn = createCurveEvaluatorNormalized(points, "monotone");
  return clamp01(evalFn(x));
}

/**
 * Evaluate a curve point count redistribution.
 * Used when changing the number of control points — places new points
 * on the current curve shape to preserve the visual appearance.
 *
 * @param points        Current control points
 * @param x             X position to evaluate
 * @returns             Y value at x on the current curve
 */
export function evaluateCurveAt(points: CurvePoint[], x: number): number {
  return evaluateCurve(points, x);
}
