/**
 * SaturationPanel.tsx
 * Saturation redistribution by luminance.
 */

import { useColorIO } from "../../../../context/ColorIOContext";
import { CurveEditor } from "../../curve/CurveEditor";
import { useCurveHandlers } from "../useCurveHandlers";

export function SaturationPanel() {
  const { editState } = useColorIO();
  const { handlePointChange, handlePointCount, handleOffset, handleReset } =
    useCurveHandlers("saturation");

  return (
    <CurveEditor
      curve={editState().saturation.curve}
      semantics="saturation"
      lineColor="rgba(100,200,255,.9)"
      onPointChange={handlePointChange}
      onPointCountChange={handlePointCount}
      onInterpolationChange={() => {}}
      onOffsetAll={handleOffset}
      onReset={handleReset}
    />
  );
}
