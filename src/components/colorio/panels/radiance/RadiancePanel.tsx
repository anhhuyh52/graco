/**
 * RadiancePanel.tsx
 * Highlight-biased radiance curve with cyclic hue background.
 */

import { useColorIO } from "../../../../context/ColorIOContext";
import { CurveEditor } from "../../curve/CurveEditor";
import { useCurveHandlers } from "../useCurveHandlers";

export function RadiancePanel() {
  const { editState } = useColorIO();
  const { handlePointChange, handlePointCount, handleOffset, handleReset } =
    useCurveHandlers("radiance");

  return (
    <CurveEditor
      curve={editState().radiance.curve}
      semantics="radiance"
      hueMode
      lineColor="rgba(255,255,180,.9)"
      onPointChange={handlePointChange}
      onPointCountChange={handlePointCount}
      onInterpolationChange={() => {}}
      onOffsetAll={handleOffset}
      onReset={handleReset}
    />
  );
}
