/**
 * CurveEditor.tsx
 *
 * Thin orchestrator for the modular curve editor.
 * Owns:
 *   - canvas ref and bounding rect reads
 *   - active point signal
 *   - rolling slider signal
 *   - event handler wiring
 *
 * Delegates to:
 *   - CurveCanvas: SVG path rendering
 *   - CurveGrid: grid lines
 *   - CurvePoints: point hit areas + visuals
 *   - CurveToolbar: right-side controls
 *   - buildSVGPath: core curve math
 *   - computeDragPosition / computeGrabOffset: interaction engine
 *
 * CSS: ./curve.css (imported by parent or globally)
 */

import { createSignal, createMemo, createEffect } from "solid-js";
import { buildSVGPath } from "../../../core/curves/curveSampling";
import { clamp01 } from "../../../core/math/clamp";
import { computeDragPosition, computeGrabOffset } from "./CurveInteractions";
import { CurveCanvas } from "./CurveCanvas";
import { CurveGrid } from "./CurveGrid";
import { CurvePoints } from "./CurvePoints";
import { CurveToolbar } from "./CurveToolbar";
import type { CurveEditorProps, CurvePoint } from "./types";

export function CurveEditor(props: CurveEditorProps) {
  let canvasRef!: HTMLDivElement;

  const [activeIndex, setActiveIndex] = createSignal(-1);
  const [sliderPos, setSliderPos] = createSignal(0.5);

  // Sync slider position with smart value when controlled externally
  createEffect(() => {
    if (props.onSmartChange) {
      const sv = clamp01(props.smartValue ?? 0);
      setSliderPos(0.5 + sv * 0.5);
    }
  });

  // ── Path computation (memoized — only recomputes when points change) ────────
  const path = createMemo(() => buildSVGPath(props.curve.points, "monotone"));

  // ── Interaction handlers ────────────────────────────────────────────────────

  const handlePointPointerDown = (e: PointerEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveIndex(index);

    const rect = canvasRef.getBoundingClientRect();
    const point = props.curve.points[index];
    const { offsetX, offsetY } = computeGrabOffset(
      e.clientX,
      e.clientY,
      rect,
      point,
    );

    const onMove = (ev: PointerEvent) => {
      const currentRect = canvasRef.getBoundingClientRect();
      const newPos = computeDragPosition(
        ev.clientX,
        ev.clientY,
        offsetX,
        offsetY,
        currentRect,
        props.curve.points,
        index,
        currentRect.width,
        ev.altKey || ev.ctrlKey || ev.metaKey, // lockX
        ev.shiftKey, // lockY
        props.semantics ?? "generic",
      );
      props.onPointChange(index, { ...newPos, tangentMode: point.tangentMode }, false);
    };

    const cleanup = () => {
      setActiveIndex(-1);
      const lastPoint = props.curve.points[index];
      props.onPointChange(index, { ...lastPoint }, true);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", cleanup);
      window.removeEventListener("pointercancel", cleanup);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", cleanup, { once: true });
    window.addEventListener("pointercancel", cleanup);
  };

  const handlePointDblClick = (e: MouseEvent, index: number) => {
    e.preventDefault();
    const current = props.curve.points[index];
    props.onPointChange(index, {
      x: current.x,
      y: props.identityReset ? current.x : 0.5,
      tangentMode: current.tangentMode,
    });
  };

  const handlePointContextMenu = (e: MouseEvent, index: number) => {
    e.preventDefault();
    props.onRemovePoint?.(index);
  };

  const handleCanvasDblClick = (e: MouseEvent) => {
    const rect = canvasRef.getBoundingClientRect();
    const newPoint: CurvePoint = {
      x: clamp01((e.clientX - rect.left) / rect.width),
      y: clamp01(1 - (e.clientY - rect.top) / rect.height),
      tangentMode: "auto",
    };
    props.onAddPoint?.(newPoint);
  };

  // ── Rolling slider (left panel) ─────────────────────────────────────────────
  const handleSliderPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    let lastY = e.clientY;
    let current = props.onSmartChange
      ? 0.5 + clamp01(props.smartValue ?? 0) * 0.5
      : sliderPos();

    const onMove = (ev: PointerEvent) => {
      const deltaY = ev.clientY - lastY;
      lastY = ev.clientY;
      const delta = -(deltaY / 200);
      const next = clamp01(current + delta);
      current = next;

      if (props.onSmartChange) {
        props.onSmartChange(clamp01((next - 0.5) * 2));
      } else {
        props.onOffsetAll?.(delta, false);
      }
      setSliderPos(next);
    };

    const cleanup = () => {
      if (!props.onSmartChange) {
        props.onOffsetAll?.(0, true);
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", cleanup);
      window.removeEventListener("pointercancel", cleanup);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", cleanup, { once: true });
    window.addEventListener("pointercancel", cleanup);
  };

  return (
    <div class="curve-editor">
      {/* ── Left: rolling slider ───────────────────────────────────────── */}
      <div class="curve-side-left">
        <div
          class="rolling-surface"
          onPointerDown={handleSliderPointerDown}
        />
        <div
          class="rolling-indicator"
          style={{ top: `${(1 - sliderPos()) * 100}%` }}
        />
      </div>

      {/* ── Center: curve canvas ───────────────────────────────────────── */}
      <div
        ref={canvasRef}
        class={`curve-box ${props.hueMode ? "hue" : ""}`}
        onDblClick={handleCanvasDblClick}
        data-curve-type={props.semantics ?? "generic"}
      >
        {/* Grid */}
        <CurveGrid showDiagonal={true} />

        {/* Curve path */}
        <CurveCanvas path={path()} lineColor={props.lineColor} />

        {/* Control points */}
        <CurvePoints
          points={props.curve.points}
          activeIndex={activeIndex()}
          semantics={props.semantics}
          onPointerDown={handlePointPointerDown}
          onDblClick={handlePointDblClick}
          onContextMenu={handlePointContextMenu}
        />
      </div>

      {/* ── Right: toolbar ─────────────────────────────────────────────── */}
      <CurveToolbar
        pointCount={props.curve.pointCount}
        onPointCountChange={props.onPointCountChange}
        onReset={props.onReset}
      />
    </div>
  );
}
