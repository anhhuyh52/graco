/**
 * Sigmoid contrast model for professional contrast curves.
 *
 * Provides a pivot-preserving sigmoid that maps [0,1] to [0,1]
 * with guaranteed endpoint preservation: f(0)=0, f(1)=1, f(pivot)=pivot.
 */

/**
 * Apply sigmoid contrast around a pivot point.
 *
 * @param x      Input luminance ∈ [0, 1]
 * @param pivot  Pivot point where the curve passes through unchanged (default 0.5)
 * @param k      Contrast strength — higher = more contrast (default 6)
 * @returns      Output luminance ∈ [0, 1]
 */
export function sigmoidContrast(
  x: number,
  pivot = 0.5,
  k = 6,
): number {
  // Raw sigmoid values at the endpoints for rescaling
  const lo = 1 / (1 + Math.exp(k * pivot));      // sigmoid(0 - pivot)
  const hi = 1 / (1 + Math.exp(-k * (1 - pivot))); // sigmoid(1 - pivot)

  const sig = 1 / (1 + Math.exp(-k * (x - pivot)));

  // Rescale so f(0)=0 and f(1)=1 exactly
  const range = hi - lo;
  if (range < 1e-10) return x; // degenerate — identity
  return Math.max(0, Math.min(1, (sig - lo) / range));
}

/**
 * Evaluate the pure sigmoid (no rescaling).
 * Useful for overlay display or shader approximation.
 */
export function pureSigmoid(x: number, k = 6): number {
  return 1 / (1 + Math.exp(-k * (x - 0.5)));
}
