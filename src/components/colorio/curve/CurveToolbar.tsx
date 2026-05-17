/**
 * CurveToolbar.tsx
 *
 * Right-side controls for the curve editor:
 * - Point count (drag or click to cycle)
 * - Interpolation mode toggle (hidden — monotone only internally)
 * - Reset button
 *
 * Kept separate from CurveEditor for clarity.
 */

import { createSignal } from "solid-js";

interface CurveToolbarProps {
  pointCount: number;
  onPointCountChange: (count: number) => void;
  onReset?: () => void;
}

export function CurveToolbar(props: CurveToolbarProps) {
  const [suppressClick, setSuppressClick] = createSignal(false);

  const handleCountPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startCount = Math.max(2, Math.min(7, Math.round(props.pointCount)));
    let lastCount = startCount;
    let moved = false;

    const onMove = (ev: PointerEvent) => {
      const delta = Math.round((startY - ev.clientY) / 18);
      const next = Math.max(2, Math.min(7, startCount + delta));
      if (next !== lastCount) {
        moved = true;
        lastCount = next;
        props.onPointCountChange(next);
      }
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", cleanup);
      window.removeEventListener("pointercancel", cleanup);
      if (moved) {
        setSuppressClick(true);
        queueMicrotask(() => setSuppressClick(false));
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", cleanup, { once: true });
    window.addEventListener("pointercancel", cleanup);
  };

  const handleCountClick = () => {
    if (suppressClick()) return;
    const current = Math.max(2, Math.min(7, Math.round(props.pointCount)));
    const next = current >= 7 ? 2 : current + 1;
    props.onPointCountChange(next);
  };

  return (
    <div class="curve-side-right">
      {/* Point count — drag to scrub, click to cycle */}
      <button
        type="button"
        class="curve-point-count"
        title="Drag to change point count"
        onPointerDown={handleCountPointerDown}
        onClick={handleCountClick}
      >
        <strong>{props.pointCount}</strong>
        <span>pts</span>
      </button>

      {/* Reset */}
      {props.onReset && (
        <button
          type="button"
          class="curve-toolbar-btn"
          onClick={() => props.onReset?.()}
          title="Reset curve"
        >
          <svg width="12" height="12" viewBox="0 0 10 10" fill="none" style="margin: auto; display: block;">
            <path
              d="M2 5a3 3 0 1 0 3-3H3"
              stroke="currentColor"
              stroke-width="1.2"
              stroke-linecap="round"
            />
            <path
              d="M3 2L2 5l3 0"
              stroke="currentColor"
              stroke-width="1.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
