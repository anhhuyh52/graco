/**
 * HalationPanel.tsx
 * Halation / highlight bleed controls.
 */

import { useColorIO } from "../../../../context/ColorIOContext";
import { ValueSlider } from "../ValueSlider";
import { clampRange, sanitize } from "../../../../core/math/clamp";

const RANGES: Record<string, [number, number]> = {
  amount: [0, 1],
  lightSpill: [0, 1],
  colorShift: [-1, 1],
  saturation: [0, 2],
};

export function HalationPanel() {
  const { editState, setEdit } = useColorIO();

  const handleChange = (key: string, value: number) => {
    const [min, max] = RANGES[key] ?? [-1, 1];
    const next = clampRange(sanitize(value), min, max);
    setEdit((s) => {
      (s.halation as any)[key] = next;
    }, `Halation ${key}`);
  };

  return (
    <>
      <ValueSlider label="Amount" value={editState().halation.amount} min={0} max={1} onChange={(v) => handleChange("amount", v)} />
      <ValueSlider label="Spill" value={editState().halation.lightSpill} min={0} max={1} onChange={(v) => handleChange("lightSpill", v)} />
      <ValueSlider label="Shift" value={editState().halation.colorShift} min={-1} max={1} onChange={(v) => handleChange("colorShift", v)} />
      <ValueSlider label="Saturation" value={editState().halation.saturation} min={0} max={2} onChange={(v) => handleChange("saturation", v)} />
    </>
  );
}
