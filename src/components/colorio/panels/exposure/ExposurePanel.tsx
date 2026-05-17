/**
 * ExposurePanel.tsx
 *
 * Exposure curve panel.
 * Semantics: free luminance remap, endpoints locked horizontally.
 */

import { useColorIO } from "../../../../context/ColorIOContext";
import { CurveEditor } from "../../curve/CurveEditor";
import { useCurveHandlers } from "../useCurveHandlers";

export function ExposurePanel() {
  const { editState } = useColorIO();
  const { handlePointChange, handlePointCount, handleOffset, handleReset } =
    useCurveHandlers("exposure");

  return (
    <CurveEditor
      curve={editState().exposure.curve}
      semantics="exposure"
      onPointChange={handlePointChange}
      onPointCountChange={handlePointCount}
      onInterpolationChange={() => {}} // monotone only — no mode switching
      onOffsetAll={handleOffset}
      onReset={handleReset}
    />
  );
}
