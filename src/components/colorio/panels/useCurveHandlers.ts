/**
 * Shared curve panel logic.
 * Provides handleCurvePointChange, handleCurvePointCount,
 * handleCurveOffset, handleCurveInterpolation for all curve panels.
 *
 * Extracted from the large handler block in Sidebar.tsx.
 */

import { useColorIO } from "../../../context/ColorIOContext";
import { clamp01 } from "../../../core/math/clamp";
import { createCurveEvaluator } from "../../../core/curves/curveEvaluator";
import type { CurvePoint } from "../../../core/curves/types";

type CurvePanelKey =
  | "exposure"
  | "contrast"
  | "density"
  | "chroma"
  | "radiance"
  | "saturation";

/**
 * Returns all curve panel handlers bound to the ColorIO context.
 * Import this hook in each curve panel component.
 */
export function useCurveHandlers(panel: CurvePanelKey) {
  const { setEdit, editState, resetPanel } = useColorIO();

  const handlePointChange = (index: number, point: { x: number; y: number }, commit = true) => {
    const sanitized: CurvePoint = {
      x: clamp01(Number.isFinite(point.x) ? point.x : 0.5),
      y: clamp01(Number.isFinite(point.y) ? point.y : 0.5),
    };
    setEdit((s) => {
      const points = s[panel].curve.points;
      if (!points[index]) return;
      points[index] = sanitized;
      // Cyclic endpoint pairing for hue-domain curves
      if (
        (panel === "density" || panel === "radiance") &&
        (index === 0 || index === points.length - 1)
      ) {
        const paired = index === 0 ? points.length - 1 : 0;
        points[paired] = { ...points[paired], y: sanitized.y };
      }
    }, `${panel} curve`, commit);
  };

  const handlePointCount = (count: number) => {
    const nextCount = Math.max(
      2,
      Math.min(7, Math.round(Number.isFinite(count) ? count : 2)),
    );
    setEdit((s) => {
      // Contrast special case for 2 points
      if (panel === "contrast" && nextCount === 2) {
        s.contrast.curve.points = [
          { x: 1 / 3, y: 0.25 },
          { x: 2 / 3, y: 0.75 },
        ];
        s.contrast.curve.pointCount = 2;
        s.contrast.curve.interpolation = "linear";
        return;
      }

      const pts = [...s[panel].curve.points].sort((a, b) => a.x - b.x);
      const interpolation = "monotone";
      let nextPoints = pts.length
        ? pts.map((p) => ({ x: clamp01(p.x), y: clamp01(p.y) }))
        : [
            { x: 0, y: panel === "contrast" ? 0 : 0.5 },
            { x: 1, y: panel === "contrast" ? 1 : 0.5 },
          ];

      // Add points in largest gaps
      while (nextPoints.length < nextCount) {
        let maxGap = -1;
        let gapIndex = 0;
        for (let i = 0; i < nextPoints.length - 1; i++) {
          const gap = nextPoints[i + 1].x - nextPoints[i].x;
          if (gap > maxGap) {
            maxGap = gap;
            gapIndex = i;
          }
        }
        const x = clamp01(nextPoints[gapIndex].x + maxGap / 2);
        const evalFn = createCurveEvaluator(nextPoints, interpolation);
        nextPoints.splice(gapIndex + 1, 0, {
          x,
          y: evalFn(x),
        });
      }

      // Remove lowest-impact interior points
      while (nextPoints.length > nextCount && nextPoints.length > 2) {
        let minImpact = Infinity;
        let dropIndex = -1;
        for (let i = 1; i < nextPoints.length - 1; i++) {
          const a = nextPoints[i - 1];
          const b = nextPoints[i];
          const c = nextPoints[i + 1];
          const area =
            Math.abs(
              a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y),
            ) / 2;
          const base = Math.hypot(c.x - a.x, c.y - a.y);
          const impact = base === 0 ? 0 : (2 * area) / base;
          if (impact < minImpact) {
            minImpact = impact;
            dropIndex = i;
          }
        }
        if (dropIndex >= 0) nextPoints.splice(dropIndex, 1);
        else nextPoints.pop();
      }

      s[panel].curve.points = nextPoints;
      s[panel].curve.pointCount = nextPoints.length;
    }, `${panel} point count`, true);
  };

  const handleOffset = (deltaY: number, commit = true) => {
    if (!Number.isFinite(deltaY) || deltaY === 0) return;
    setEdit((s) => {
      s[panel].curve.points = s[panel].curve.points.map((p) => ({
        ...p,
        y: Math.max(0, Math.min(1, p.y + deltaY)),
      }));
    }, `${panel} offset`, commit);
  };

  const handleReset = () => resetPanel(panel);

  return { handlePointChange, handlePointCount, handleOffset, handleReset };
}
