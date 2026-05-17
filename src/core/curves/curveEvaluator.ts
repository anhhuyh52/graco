import { clamp01 } from "../math/clamp";
import type { CurvePoint } from "./types";
import { computeFritschCarlsonTangents } from "./curveTangents";
import { evaluateHermiteSegment } from "../interpolation/monotoneHermite";

export type CurveInterpolationMode = "linear" | "bezier" | "cubic" | "monotone";

export function normalizeInterpolationMode(
  interpolation: string | undefined,
): CurveInterpolationMode {
  const mode = (interpolation ?? "").trim().toLowerCase();
  if (mode === "linear") return "linear";
  if (mode === "bezier") return "bezier";
  if (mode === "monotone" || mode === "hermite" || mode === "mhermite") {
    return "monotone";
  }
  return "cubic";
}

export function normalizeCurvePoints(points: CurvePoint[]): CurvePoint[] {
  return [...points]
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    .map((p) => ({
      x: clamp01(p.x),
      y: clamp01(p.y),
      tangentMode: p.tangentMode,
    }))
    .sort((a, b) => a.x - b.x);
}

function evalLinear(points: CurvePoint[], x: number): number {
  if (!points.length) return 0.5;
  if (x <= points[0].x) return points[0].y;
  if (x >= points[points.length - 1].x) return points[points.length - 1].y;

  for (let i = 0; i < points.length - 1; i += 1) {
    const left = points[i];
    const right = points[i + 1];
    if (x >= left.x && x <= right.x) {
      const t = (x - left.x) / Math.max(0.0001, right.x - left.x);
      return clamp01(left.y + (right.y - left.y) * t);
    }
  }

  return 0.5;
}

function evalBezier(points: CurvePoint[], x: number): number {
  if (points.length < 2) return points[0]?.y ?? 0.5;

  for (let i = 0; i < points.length - 1; i += 1) {
    const prev = points[i - 1] ?? points[i];
    const current = points[i];
    const next = points[i + 1];
    const after = points[i + 2] ?? next;
    if (x < current.x || x > next.x) continue;

    const c1 = {
      x: current.x + (next.x - prev.x) / 6,
      y: current.y + (next.y - prev.y) / 6,
    };
    const c2 = {
      x: next.x - (after.x - current.x) / 6,
      y: next.y - (after.y - current.y) / 6,
    };

    let lo = 0;
    let hi = 1;
    for (let step = 0; step < 18; step += 1) {
      const t = (lo + hi) / 2;
      const mt = 1 - t;
      const bx =
        mt * mt * mt * current.x +
        3 * mt * mt * t * c1.x +
        3 * mt * t * t * c2.x +
        t * t * t * next.x;
      if (bx < x) lo = t;
      else hi = t;
    }

    const t = (lo + hi) / 2;
    const mt = 1 - t;
    return clamp01(
      mt * mt * mt * current.y +
        3 * mt * mt * t * c1.y +
        3 * mt * t * t * c2.y +
        t * t * t * next.y,
    );
  }

  return evalLinear(points, x);
}

function precomputeNaturalCubic(points: CurvePoint[]) {
  const n = points.length;
  const a = points.map((p) => p.y);
  const h = Array.from({ length: n - 1 }, (_, i) =>
    Math.max(0.0001, points[i + 1].x - points[i].x),
  );
  const alpha = Array(n).fill(0);

  for (let i = 1; i < n - 1; i += 1) {
    alpha[i] =
      (3 / h[i]) * (a[i + 1] - a[i]) -
      (3 / h[i - 1]) * (a[i] - a[i - 1]);
  }

  const l = Array(n).fill(1);
  const mu = Array(n).fill(0);
  const z = Array(n).fill(0);
  const c = Array(n).fill(0);
  const b = Array(n - 1).fill(0);
  const d = Array(n - 1).fill(0);

  for (let i = 1; i < n - 1; i += 1) {
    l[i] = 2 * (points[i + 1].x - points[i - 1].x) - h[i - 1] * mu[i - 1];
    mu[i] = h[i] / l[i];
    z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
  }

  for (let j = n - 2; j >= 0; j -= 1) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (a[j + 1] - a[j]) / h[j] - (h[j] * (c[j + 1] + 2 * c[j])) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }

  return { a, b, c, d };
}

function createNaturalCubicEvaluator(points: CurvePoint[]) {
  if (points.length < 3) return (x: number) => evalLinear(points, x);

  const { a, b, c, d } = precomputeNaturalCubic(points);

  return (x: number) => {
    x = clamp01(x);
    if (x <= points[0].x) return points[0].y;
    if (x >= points[points.length - 1].x) return points[points.length - 1].y;

    let segment = 0;
    for (let i = 0; i < points.length - 1; i += 1) {
      if (x >= points[i].x && x <= points[i + 1].x) {
        segment = i;
        break;
      }
    }

    const dx = x - points[segment].x;
    return clamp01(
      a[segment] +
        b[segment] * dx +
        c[segment] * dx * dx +
        d[segment] * dx * dx * dx,
    );
  };
}

function createMonotoneEvaluator(points: CurvePoint[]) {
  const tangents = computeFritschCarlsonTangents(points);

  return (x: number) => {
    x = clamp01(x);
    if (x <= points[0].x) return points[0].y;
    if (x >= points[points.length - 1].x) return points[points.length - 1].y;

    let i = 0;
    for (; i < points.length - 1; i += 1) {
      if (x >= points[i].x && x <= points[i + 1].x) break;
    }

    const p0 = points[i];
    const p1 = points[i + 1];
    const deltaX = p1.x - p0.x;
    if (deltaX < 1e-6) return p0.y;

    const t = (x - p0.x) / deltaX;
    const y = evaluateHermiteSegment(
      p0.y,
      p1.y,
      tangents[i],
      tangents[i + 1],
      deltaX,
      t,
    );
    return clamp01(y);
  };
}

export function createCurveEvaluatorNormalized(
  points: CurvePoint[],
  mode: CurveInterpolationMode,
): (x: number) => number {
  if (points.length === 0) return () => 0.5;
  if (points.length === 1) return () => points[0].y;

  if (mode === "linear") return (x) => evalLinear(points, x);
  if (mode === "bezier") return (x) => evalBezier(points, x);
  if (mode === "monotone") return createMonotoneEvaluator(points);
  return createNaturalCubicEvaluator(points);
}

export function createCurveEvaluator(
  inputPoints: CurvePoint[],
  interpolation: string | undefined,
): (x: number) => number {
  const points = normalizeCurvePoints(inputPoints);
  const mode = normalizeInterpolationMode(interpolation);
  return createCurveEvaluatorNormalized(points, mode);
}

export function evaluateCurveValue(
  inputPoints: CurvePoint[],
  interpolation: string | undefined,
  x: number,
): number {
  return createCurveEvaluator(inputPoints, interpolation)(x);
}
