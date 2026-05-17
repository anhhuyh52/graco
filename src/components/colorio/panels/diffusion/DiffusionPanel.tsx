/**
 * DiffusionPanel.tsx
 * Diffusion / soft glow controls with focus point pad.
 */

import { useColorIO } from "../../../../context/ColorIOContext";
import { ValueSlider } from "../ValueSlider";
import { PointPad } from "../PointPad";
import { clampRange, sanitize } from "../../../../core/math/clamp";

const RANGES: Record<string, [number, number]> = {
  amount: [0, 1],
  fog: [0, 1],
  threshold: [0, 1],
  focus: [0, 1],
};

export function DiffusionPanel() {
  const { editState, setEdit, showToast } = useColorIO();

  const handleChange = (key: string, value: number) => {
    const [min, max] = RANGES[key] ?? [0, 1];
    const next = clampRange(sanitize(value), min, max);
    setEdit((s) => {
      (s.diffusion as any)[key] = next;
    }, `Diffusion ${key}`);
  };

  return (
    <>
      <ValueSlider label="Amount" value={editState().diffusion.amount} min={0} max={1} onChange={(v) => handleChange("amount", v)} />
      <ValueSlider label="Fog" value={editState().diffusion.fog} min={0} max={1} onChange={(v) => handleChange("fog", v)} />
      <ValueSlider label="Threshold" value={editState().diffusion.threshold} min={0} max={1} onChange={(v) => handleChange("threshold", v)} />
      <ValueSlider label="Focus" value={editState().diffusion.focus} min={0} max={1} onChange={(v) => handleChange("focus", v)} />
      <PointPad
        label="Center"
        x={editState().diffusion.focusX * 2 - 1}
        y={1 - editState().diffusion.focusY * 2}
        xLabel="X"
        yLabel="Y"
        onChange={(point) =>
          setEdit((s) => {
            s.diffusion.focusX = (point.x + 1) / 2;
            s.diffusion.focusY = (1 - point.y) / 2;
          }, "Diffusion Center")
        }
      />
      <button
        type="button"
        class="small-action"
        onClick={() => showToast("Set zoom to 100% for accurate diffusion preview", "info")}
      >
        Zoom to 100% for accurate preview
      </button>
    </>
  );
}
