/**
 * ScatteringPanel.tsx
 * Scattering shadow/highlight point pads.
 */

import { useColorIO } from "../../../../context/ColorIOContext";
import { PointPad } from "../PointPad";

export function ScatteringPanel() {
  const { editState, setEdit } = useColorIO();

  return (
    <div class="point-grid">
      <PointPad
        label="Shadows"
        x={editState().scattering.shadows.x}
        y={editState().scattering.shadows.y}
        onChange={(point) =>
          setEdit((s) => { s.scattering.shadows = point; }, "Scattering Shadows")
        }
      />
      <PointPad
        label="Highlights"
        x={editState().scattering.highlights.x}
        y={editState().scattering.highlights.y}
        onChange={(point) =>
          setEdit((s) => { s.scattering.highlights = point; }, "Scattering Highlights")
        }
      />
    </div>
  );
}
