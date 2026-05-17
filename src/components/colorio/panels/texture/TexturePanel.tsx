/**
 * TexturePanel.tsx
 * Grain and acutance controls.
 */

import { useColorIO } from "../../../../context/ColorIOContext";
import { ValueSlider } from "../ValueSlider";
import { clampRange, sanitize } from "../../../../core/math/clamp";

const RANGES: Record<string, [number, number]> = {
  grainAmount: [0, 1],
  grainChroma: [0, 1],
  acutance: [-1, 1],
  resolution: [-1, 1],
};

export function TexturePanel() {
  const { editState, setEdit } = useColorIO();

  const handleChange = (key: string, value: number) => {
    const [min, max] = RANGES[key] ?? [-1, 1];
    const next = clampRange(sanitize(value), min, max);
    setEdit((s) => {
      (s.texture as any)[key] = next;
    }, `Texture ${key}`);
  };

  return (
    <>
      <ValueSlider label="Grain" value={editState().texture.grainAmount} min={0} max={1} onChange={(v) => handleChange("grainAmount", v)} />
      <ValueSlider label="Chroma" value={editState().texture.grainChroma} min={0} max={1} onChange={(v) => handleChange("grainChroma", v)} />
      <ValueSlider label="Acutance" value={editState().texture.acutance} min={-1} max={1} onChange={(v) => handleChange("acutance", v)} />
      <ValueSlider label="Resolution" value={editState().texture.resolution} min={-1} max={1} onChange={(v) => handleChange("resolution", v)} />
      <p class="render-note">Render-only · Not included in LUT exports</p>
    </>
  );
}
