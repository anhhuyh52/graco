/**
 * RGBPanel.tsx
 * Shadow and Highlight RGB channel lifts.
 */

import { useColorIO } from "../../../../context/ColorIOContext";
import { ValueSlider } from "../ValueSlider";
import { clampSigned, sanitize } from "../../../../core/math/clamp";

export function RGBPanel() {
  const { editState, setEdit } = useColorIO();

  const handleChange = (key: string, value: number) => {
    const next = clampSigned(sanitize(value));
    setEdit((s) => {
      (s.rgb as any)[key] = next;
    }, `RGB ${key}`);
  };

  return (
    <>
      <div class="section-divider">Shadows</div>
      <ValueSlider label="Red" value={editState().rgb.shadowR} onChange={(v) => handleChange("shadowR", v)} />
      <ValueSlider label="Green" value={editState().rgb.shadowG} onChange={(v) => handleChange("shadowG", v)} />
      <ValueSlider label="Blue" value={editState().rgb.shadowB} onChange={(v) => handleChange("shadowB", v)} />
      <div class="section-divider">Highlights</div>
      <ValueSlider label="Red" value={editState().rgb.highlightR} onChange={(v) => handleChange("highlightR", v)} />
      <ValueSlider label="Green" value={editState().rgb.highlightG} onChange={(v) => handleChange("highlightG", v)} />
      <ValueSlider label="Blue" value={editState().rgb.highlightB} onChange={(v) => handleChange("highlightB", v)} />
    </>
  );
}
