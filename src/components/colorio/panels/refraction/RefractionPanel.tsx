/**
 * RefractionPanel.tsx
 * Refraction shadow/highlight pads with threshold and link toggle.
 */

import { useColorIO } from "../../../../context/ColorIOContext";
import { PointPad } from "../PointPad";
import { ValueSlider } from "../ValueSlider";

export function RefractionPanel() {
  const { editState, setEdit } = useColorIO();

  return (
    <>
      <div class="point-grid">
        <PointPad
          label="Shadows"
          x={editState().refraction.shadows[0]?.x ?? 0}
          y={editState().refraction.shadows[0]?.y ?? 0}
          onChange={(point) =>
            setEdit((s) => {
              s.refraction.shadows[0] = point;
              if (s.refraction.linked) s.refraction.highlights[0] = point;
            }, "Refraction Shadows")
          }
        />
        <PointPad
          label="Highlights"
          x={editState().refraction.highlights[0]?.x ?? 0}
          y={editState().refraction.highlights[0]?.y ?? 0}
          onChange={(point) =>
            setEdit((s) => {
              s.refraction.highlights[0] = point;
              if (s.refraction.linked) s.refraction.shadows[0] = point;
            }, "Refraction Highlights")
          }
        />
      </div>
      <ValueSlider
        label="Threshold"
        value={editState().refraction.threshold}
        min={0}
        max={1}
        onChange={(v) =>
          setEdit((s) => { s.refraction.threshold = v; }, "Refraction Threshold")
        }
      />
      <button
        type="button"
        class="small-action"
        onClick={() =>
          setEdit((s) => { s.refraction.linked = !s.refraction.linked; }, "Refraction Link")
        }
      >
        {editState().refraction.linked ? "Linked" : "Unlinked"}
      </button>
    </>
  );
}
