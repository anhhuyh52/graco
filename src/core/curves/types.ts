/**
 * Core curve types used across the grading architecture.
 * These are intentionally kept minimal and backward-compatible
 * with the existing EditState / Curve types in ColorIOContext.
 */

/** Tangent behavior at a control point. */
export type TangentMode = "auto" | "smooth" | "flat" | "linear";

/**
 * A single control point on a grading curve.
 * Backward-compatible with the existing CurvePoint from ColorIOContext.
 */
export interface CurvePoint {
  x: number;
  y: number;
  tangentMode?: TangentMode;
}

/**
 * The full curve data shape (matches ColorIOContext.Curve).
 */
export interface Curve {
  points: CurvePoint[];
  interpolation: string;
  master: number;
  pointCount: number;
}

/**
 * Curve semantic type — determines endpoint protection,
 * interpolation behavior, and display style.
 */
export type CurveSemantics =
  | "exposure"    // free luminance remap, endpoints locked horizontally
  | "contrast"    // pivot-preserving, endpoints fully anchored
  | "density"     // hue-domain weighting, cyclic continuity
  | "chroma"      // chroma redistribution
  | "radiance"    // highlight-biased, cyclic
  | "saturation"  // chroma redistribution by luminance
  | "generic";    // no special constraints
