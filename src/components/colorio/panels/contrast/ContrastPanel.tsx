/**
 * ContrastPanel.tsx
 *
 * Contrast curve panel.
 * Semantics: pivot-preserving, endpoints fully anchored.
 * Includes smart contrast slider (rolling slider maps to smartContrast).
 */

import { useColorIO } from "../../../../context/ColorIOContext";
import { CurveEditor } from "../../curve/CurveEditor";
import { useCurveHandlers } from "../useCurveHandlers";

export function ContrastPanel() {
  const { editState, setEdit } = useColorIO();
  const { handlePointChange, handlePointCount, handleReset } =
    useCurveHandlers("contrast");

  return (
    <CurveEditor
      curve={editState().contrast.curve}
      semantics="contrast"
      identityReset
      onPointChange={handlePointChange}
      onPointCountChange={handlePointCount}
      onInterpolationChange={() => {}} // monotone only
      smartValue={editState().contrast.smartContrast}
      onSmartChange={(value) =>
        setEdit((s) => {
          s.contrast.smartContrast = value;
        }, "Smart Contrast")
      }
      onReset={handleReset}
    />
  );
}
