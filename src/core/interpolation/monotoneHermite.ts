/**
 * Monotone Cubic Hermite Interpolation
 *
 * Pure function — no side effects, no imports beyond math.
 * Evaluates a cubic Hermite spline at parameter `t` ∈ [0, 1]
 * given the two endpoint values, the interval width, and the
 * Fritsch-Carlson monotone tangents at both endpoints.
 */

/** Hermite basis polynomials */
function h00(t: number) { return 2 * t * t * t - 3 * t * t + 1; }
function h10(t: number) { return t * t * t - 2 * t * t + t; }
function h01(t: number) { return -2 * t * t * t + 3 * t * t; }
function h11(t: number) { return t * t * t - t * t; }

/**
 * Evaluate a cubic Hermite segment at parameter `t` ∈ [0, 1].
 *
 * @param y0     value at left endpoint
 * @param y1     value at right endpoint
 * @param m0     tangent (slope) at left endpoint
 * @param m1     tangent (slope) at right endpoint
 * @param deltaX interval width (x1 - x0), used to scale tangents
 * @param t      parametric position ∈ [0, 1]
 */
export function evaluateHermiteSegment(
  y0: number,
  y1: number,
  m0: number,
  m1: number,
  deltaX: number,
  t: number,
): number {
  return (
    h00(t) * y0 +
    h10(t) * deltaX * m0 +
    h01(t) * y1 +
    h11(t) * deltaX * m1
  );
}
