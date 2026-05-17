/**
 * Filmic soft clipping — shoulder and toe rolloff.
 *
 * Provides asymptotic clipping behavior that avoids hard clipping at 0 and 1.
 * Based on the Hable/Reinhard approach used in film-grade pipelines.
 */

/**
 * Apply a smooth shoulder rolloff above `shoulder` threshold.
 * Values below `shoulder` pass through unchanged.
 * Values approach 1.0 asymptotically — never hard-clip.
 *
 * @param x         Input ∈ [0, ∞)
 * @param shoulder  Threshold where rolloff begins (default 0.8)
 * @param strength  Controls rolloff sharpness (default 1.0)
 */
export function shoulderRolloff(
  x: number,
  shoulder = 0.8,
  strength = 1.0,
): number {
  if (x <= shoulder) return x;
  const t = (x - shoulder) / (1 - shoulder + 1e-6);
  // Smooth asymptotic approach using (2 - t) / 2 style rolloff
  const rolloff = 1 - Math.exp(-strength * t);
  return shoulder + (1 - shoulder) * rolloff;
}

/**
 * Apply a smooth toe rolloff below `toe` threshold.
 * Values above `toe` pass through unchanged.
 * Values approach 0.0 asymptotically from below.
 *
 * @param x        Input ∈ (-∞, 1]
 * @param toe      Threshold where rolloff begins (default 0.2)
 * @param strength Controls rolloff sharpness (default 1.0)
 */
export function toeRolloff(
  x: number,
  toe = 0.2,
  strength = 1.0,
): number {
  if (x >= toe) return x;
  const t = (toe - x) / (toe + 1e-6);
  const rolloff = 1 - Math.exp(-strength * t);
  return toe - toe * rolloff;
}

/**
 * Apply both shoulder and toe rolloff for a complete filmic response.
 */
export function filmicSoftClip(
  x: number,
  toe = 0.05,
  shoulder = 0.92,
  strength = 1.2,
): number {
  const withToe = toeRolloff(x, toe, strength);
  return shoulderRolloff(withToe, shoulder, strength);
}
