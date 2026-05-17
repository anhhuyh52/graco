/**
 * ChromaPanel.tsx
 * Chroma redistribution curve.
 */

import { useColorIO } from "../../../../context/ColorIOContext";
import { CurveEditor } from "../../curve/CurveEditor";
import { useCurveHandlers } from "../useCurveHandlers";

export function ChromaPanel() {
  const { editState } = useColorIO();
  const { handlePointChange, handlePointCount, handleOffset, handleReset } =
    useCurveHandlers("chroma");

  return (
    <CurveEditor
      curve={editState().chroma.curve}
      semantics="chroma"
      lineColor="rgba(255,200,100,.9)"
      onPointChange={handlePointChange}
      onPointCountChange={handlePointCount}
      onInterpolationChange={() => {}}
      onOffsetAll={handleOffset}
      onReset={handleReset}
    />
  );
}
