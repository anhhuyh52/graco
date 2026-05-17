/**
 * SpotlightPanel.tsx
 * Spotlight relighting controls.
 */

import { useColorIO } from "../../../../context/ColorIOContext";
import { ValueSlider } from "../ValueSlider";
import { clampRange, sanitize } from "../../../../core/math/clamp";

const RANGES: Record<string, [number, number]> = {
  amount: [0, 1],
  focus: [0, 1],
  pop: [0, 1],
  bias: [-1, 1],
};

export function SpotlightPanel() {
  const { editState, setEdit } = useColorIO();

  const handleChange = (key: string, value: number) => {
    const [min, max] = RANGES[key] ?? [-1, 1];
    const next = clampRange(sanitize(value), min, max);
    setEdit((s) => {
      (s.spotlight as any)[key] = next;
    }, `Spotlight ${key}`);
  };

  return (
    <>
      <ValueSlider label="Amount" value={editState().spotlight.amount} min={0} max={1} onChange={(v) => handleChange("amount", v)} />
      <ValueSlider label="Focus" value={editState().spotlight.focus} min={0} max={1} onChange={(v) => handleChange("focus", v)} />
      <ValueSlider label="Pop" value={editState().spotlight.pop} min={0} max={1} onChange={(v) => handleChange("pop", v)} />
      <ValueSlider label="Bias" value={editState().spotlight.bias} min={-1} max={1} onChange={(v) => handleChange("bias", v)} />
      <p class="render-note">Render-only · Not included in LUT exports</p>
    </>
  );
}
