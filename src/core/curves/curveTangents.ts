/**
 * Fritsch-Carlson monotone tangent computation.
 *
 * Given a sorted array of control points, computes tangents at each
 * point such that the resulting cubic Hermite spline is monotone
 * within each interval — preventing any overshoot or oscillation.
 *
 * Reference: Fritsch & Carlson (1980), "Monotone Piecewise Cubic Interpolation"
 */

export interface ControlPoint {
  x: number;
  y: number;
  tangentMode?: "auto" | "smooth" | "flat" | "linear";
}

/**
 * Compute monotone Hermite tangents for all points using the
 * Fritsch-Carlson algorithm.
 *
 * @param points  Sorted array of control points (must have at least 2)
 * @returns       Array of tangents m[i] — one per point
 */
export function computeFritschCarlsonTangents(
  points: ControlPoint[],
): number[] {
  const n = points.length;

  if (n < 2) return new Array(n).fill(0);
  if (n === 2) {
    // Linear segment — both tangents equal the chord slope
    const dx = points[1].x - points[0].x;
    const slope = dx === 0 ? 0 : (points[1].y - points[0].y) / dx;
    return [slope, slope];
  }

  // ── Step 1: compute chord slopes ──────────────────────────────────────────
  const d = new Array<number>(n - 1);
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    d[i] = dx === 0 ? 0 : (points[i + 1].y - points[i].y) / dx;
  }

  // ── Step 2: initial tangents ───────────────────────────────────────────────
  const m = new Array<number>(n);

  // Endpoints: match chord slope (catmull-rom style)
  m[0] = d[0];
  m[n - 1] = d[n - 2];

  // Interior points: average neighboring chord slopes, zero at sign change
  for (let i = 1; i < n - 1; i++) {
    const mode = points[i].tangentMode ?? "auto";

    if (mode === "flat") {
      m[i] = 0;
      continue;
    }

    if (mode === "linear") {
      // Hard transition — use the chord slope of the next segment
      m[i] = d[i];
      continue;
    }

    // "auto" and "smooth" — monotone average
    if (d[i - 1] * d[i] <= 0) {
      // Sign change or plateau: zero tangent (ensures monotonicity)
      m[i] = 0;
    } else {
      m[i] = (d[i - 1] + d[i]) * 0.5;
    }
  }

  // ── Step 3: Fritsch-Carlson constraint (prevent overshoot > 3×chord) ──────
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(d[i]) < 1e-10) {
      // Flat segment — force both endpoint tangents to zero
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }

    const alpha = m[i] / d[i];
    const beta = m[i + 1] / d[i];
    const h = Math.hypot(alpha, beta);

    if (h > 3) {
      const scale = 3 / h;
      m[i] = scale * alpha * d[i];
      m[i + 1] = scale * beta * d[i];
    }
  }

  return m;
}
