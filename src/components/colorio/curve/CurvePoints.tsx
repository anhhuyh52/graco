/**
 * CurvePoints.tsx
 *
 * Renders control points with professional Resolve-like UX:
 * - 8px visible dot (precise, non-giant)
 * - 28px invisible hit area (easy to grab)
 * - Smooth hover/active state transitions
 * - Endpoint visual distinction
 *
 * Receives interaction callbacks from CurveEditor.
 * No interaction logic here — only rendering.
 */

import { For } from "solid-js";
import type { CurvePoint, CurveSemantics } from "./types";

interface CurvePointsProps {
  points: CurvePoint[];
  activeIndex: number;
  semantics?: CurveSemantics;
  onPointerDown: (e: PointerEvent, index: number) => void;
  onDblClick: (e: MouseEvent, index: number) => void;
  onContextMenu: (e: MouseEvent, index: number) => void;
}

export function CurvePoints(props: CurvePointsProps) {
  // Determine sorted indices for endpoint detection
  const getSortedIndex = (index: number): number => {
    const sorted = [...props.points]
      .map((p, i) => ({ x: p.x, origIndex: i }))
      .sort((a, b) => a.x - b.x);
    return sorted.findIndex((p) => p.origIndex === index);
  };

  return (
    <For each={props.points}>
      {(point, index) => {
        const sortedIdx = () => getSortedIndex(index());
        const isEndpoint = () =>
          sortedIdx() === 0 || sortedIdx() === props.points.length - 1;
        const isActive = () => props.activeIndex === index();

        return (
          <div
            class={`curve-point-hit ${isActive() ? "active" : ""} ${isEndpoint() ? "endpoint" : ""}`}
            style={{
              left: `${point.x * 100}%`,
              top: `${(1 - point.y) * 100}%`,
            }}
            onPointerDown={(e: PointerEvent) => {
              props.onPointerDown(e, index());
            }}
            onDblClick={(e: MouseEvent) => {
              props.onDblClick(e, index());
            }}
            onContextMenu={(e: MouseEvent) => {
              props.onContextMenu(e, index());
            }}
          >
            <div class="curve-point-visual" />
          </div>
        );
      }}
    </For>
  );
}
