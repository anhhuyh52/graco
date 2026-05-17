/** Clamp a value to [0, 1]. */
export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** Clamp a value to [-1, 1]. */
export const clampSigned = (v: number): number => Math.max(-1, Math.min(1, v));

/** Clamp a value to an arbitrary [min, max] range. */
export const clampRange = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

/** Return value if finite, otherwise fallback. */
export const sanitize = (v: number, fallback = 0): number =>
  Number.isFinite(v) ? v : fallback;
