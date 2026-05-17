/**
 * Curve sampling and SVG path generation.
 *
 * Separated from evaluation so the renderer can be pure:
 * takes normalized points and returns an SVG path string.
 * No DOM access, no side effects.
 */

import {
  createCurveEvaluatorNormalized,
  normalizeCurvePoints,
  normalizeInterpolationMode,
} from "./curveEvaluator";
import type { CurvePoint } from "./types";

/** Number of samples used to generate the SVG path. */
const PATH_SAMPLES = 256;

/**
 * Build an SVG path string for a curve.
 * Uses 256 evenly-spaced samples for smooth visual rendering.
 *
 * The coordinate system matches SVG viewBox="0 0 100 100":
 * - x: 0 = left, 100 = right
 * - y: 0 = top, 100 = bottom (Y is flipped from value space)
 *
 * @param inputPoints  Control points (unsorted/unnormalized OK)
 * @returns            SVG path string like "M 0 50 L 1 50 ..."
 */
export function buildSVGPath(
  inputPoints: CurvePoint[],
  interpolation?: string,
): string {
  const points = normalizeCurvePoints(inputPoints);

  if (points.length < 2) return "";

  const parts: string[] = [];
  const evalFn = createCurveEvaluatorNormalized(
    points,
    normalizeInterpolationMode(interpolation),
  );

  for (let s = 0; s <= PATH_SAMPLES; s++) {
    const x = s / PATH_SAMPLES;
    const y = evalFn(x);

    const px = x * 100;
    const py = (1 - y) * 100; // flip Y for SVG coordinate system

    parts.push(`${s === 0 ? "M" : "L"} ${px.toFixed(2)} ${py.toFixed(2)}`);
  }

  return parts.join(" ");
}

/**
 * Sample the curve at N evenly-spaced x positions.
 * Useful for LUT generation or histogram overlay.
 *
 * @param inputPoints  Control points
 * @param samples      Number of output samples (default 256)
 * @returns            Array of {x, y} pairs
 */
export function sampleCurve(
  inputPoints: CurvePoint[],
  arg2: number | string | undefined = 256,
  arg3?: number,
): Array<{ x: number; y: number }> {
  const interpolation = typeof arg2 === "string" ? arg2 : undefined;
  const samples = typeof arg2 === "number" ? arg2 : (arg3 ?? 256);

  const points = normalizeCurvePoints(inputPoints);
  const evalFn = createCurveEvaluatorNormalized(
    points,
    normalizeInterpolationMode(interpolation),
  );

  return Array.from({ length: samples }, (_, i) => {
    const x = i / (samples - 1);
    return { x, y: evalFn(x) };
  });
}
