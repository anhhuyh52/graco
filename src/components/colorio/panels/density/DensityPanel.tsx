/**
 * DensityPanel.tsx
 *
 * Density curve — hue-domain weighting with cyclic endpoint pairing.
 */

import { useColorIO } from "../../../../context/ColorIOContext";
import { CurveEditor } from "../../curve/CurveEditor";
import { useCurveHandlers } from "../useCurveHandlers";

export function DensityPanel() {
  const { editState } = useColorIO();
  const { handlePointChange, handlePointCount, handleOffset, handleReset } =
    useCurveHandlers("density");

  return (
    <CurveEditor
      curve={editState().density.curve}
      semantics="density"
      hueMode
      lineColor="rgba(255,255,255,.9)"
      onPointChange={handlePointChange}
      onPointCountChange={handlePointCount}
      onInterpolationChange={() => {}}
      onOffsetAll={handleOffset}
      onReset={handleReset}
    />
  );
}
