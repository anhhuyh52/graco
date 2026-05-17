/**
 * BalancePanel.tsx
 * Exposure/Saturation and Temperature/Tint 2D pads.
 */

import { useColorIO } from "../../../../context/ColorIOContext";
import { PointPad } from "../PointPad";

export function BalancePanel() {
  const { editState, setEdit } = useColorIO();

  return (
    <>
      <div class="balance-readout">
        <span class="balance-pill">
          Exp {Math.round((editState().balance.exposure + 1) * 100)}%&nbsp;
          Sat {Math.round((editState().balance.saturation + 1) * 100)}%
        </span>
        <span class="balance-pill">
          Tnt {editState().balance.tint.toFixed(2)}&nbsp;
          Tmp {editState().balance.temperature.toFixed(2)}
        </span>
      </div>
      <div class="point-grid">
        <PointPad
          label="Exp / Sat"
          variant="balance-left"
          x={editState().balance.saturation}
          y={editState().balance.exposure}
          onChange={(point) => {
            setEdit((s) => {
              s.balance.saturation = Math.max(-1, Math.min(1, point.x));
              s.balance.exposure = Math.max(-1, Math.min(1, point.y));
            }, "Balance", false);
          }}
          onCommit={(point) => {
            setEdit((s) => {
              s.balance.saturation = Math.max(-1, Math.min(1, point.x));
              s.balance.exposure = Math.max(-1, Math.min(1, point.y));
            }, "Balance", true);
          }}
        />
        <PointPad
          label="Tnt / Tmp"
          variant="balance-right"
          x={editState().balance.tint}
          y={editState().balance.temperature}
          onChange={(point) => {
            setEdit((s) => {
              s.balance.tint = Math.max(-1, Math.min(1, point.x));
              s.balance.temperature = Math.max(-1, Math.min(1, point.y));
            }, "Balance", false);
          }}
          onCommit={(point) => {
            setEdit((s) => {
              s.balance.tint = Math.max(-1, Math.min(1, point.x));
              s.balance.temperature = Math.max(-1, Math.min(1, point.y));
            }, "Balance", true);
          }}
        />
      </div>
    </>
  );
}
