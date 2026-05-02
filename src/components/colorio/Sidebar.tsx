import { createSignal, Show, For } from "solid-js";
import { useColorIO } from "../../context/ColorIOContext";

// ─── Sub-components ────────────────────────────────────────────────────────────

interface PanelSectionProps {
  id: string;
  title: string;
  icon: string;
  isOpen: boolean;
  bypassed?: boolean;
  onToggle: () => void;
  onBypassToggle?: () => void;
  onReset?: () => void;
  children: any;
}

function PanelSection(props: PanelSectionProps) {
  const handleResetClick = (e: MouseEvent) => {
    e.stopPropagation();
    props.onReset?.();
  };

  const handleBypassClick = (e: MouseEvent) => {
    e.stopPropagation();
    props.onBypassToggle?.();
  };

  return (
    <div class={`panel-section ${props.bypassed ? "bypassed" : ""}`}>
      <button class="panel-header" onClick={props.onToggle}>
        <img src={props.icon} alt="" class="panel-icon" />
        <span class="panel-title">{props.title}</span>

        {/* Per-panel bypass toggle */}
        <Show when={props.onBypassToggle}>
          <span
            class={`panel-bypass-btn ${props.bypassed ? "active" : ""}`}
            title={props.bypassed ? "Enable panel" : "Bypass panel"}
            onClick={handleBypassClick}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <circle
                cx="5"
                cy="5"
                r="4"
                stroke="currentColor"
                stroke-width="1.2"
              />
              <line
                x1="2.5"
                y1="2.5"
                x2="7.5"
                y2="7.5"
                stroke="currentColor"
                stroke-width="1.2"
                stroke-linecap="round"
              />
            </svg>
          </span>
        </Show>

        {/* Per-panel reset */}
        <Show when={props.onReset}>
          <span
            class="panel-reset-btn"
            title="Reset to default"
            onClick={handleResetClick}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
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
          </span>
        </Show>

        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          class={`chevron ${props.isOpen ? "open" : ""}`}
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <Show when={props.isOpen}>
        <div class="panel-content">{props.children}</div>
      </Show>
    </div>
  );
}

function ValueSlider(props: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const min = () => props.min ?? -1;
  const max = () => props.max ?? 1;
  // Clamp the fill % so it stays within 0-100 regardless of value range
  const percent = () =>
    Math.max(0, Math.min(100, ((props.value - min()) / (max() - min())) * 100));

  return (
    <div class="value-slider">
      <span class="slider-label">{props.label}</span>
      <div class="slider-track-wrapper">
        <input
          type="range"
          min={min()}
          max={max()}
          step={props.step ?? 0.01}
          value={props.value}
          onInput={(e) => props.onChange(parseFloat(e.currentTarget.value))}
          class="slider-input"
        />
        <div class="slider-track">
          <div class="slider-fill" style={{ width: `${percent()}%` }} />
        </div>
      </div>
      <span class="slider-value">{props.value.toFixed(2)}</span>
    </div>
  );
}

function PointPad(props: {
  label: string;
  x: number;
  y: number;
  xLabel?: string;
  yLabel?: string;
  onChange: (point: { x: number; y: number }) => void;
}) {
  let padRef: HTMLDivElement | undefined;

  const updateFromEvent = (e: PointerEvent) => {
    if (!padRef) return;
    const rect = padRef.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
    const y = Math.max(-1, Math.min(1, 1 - ((e.clientY - rect.top) / rect.height) * 2));
    props.onChange({ x, y });
  };

  const angle = () => Math.floor((Math.atan2(props.y, props.x) * 180) / Math.PI);
  const distance = () => Math.round(100 * Math.sqrt(props.x * props.x + props.y * props.y));

  return (
    <div class="point-control">
      <div class="point-readout">
        <span>{props.label}</span>
        <span>
          H: {angle()}° S: {distance()}%
        </span>
      </div>
      <div
        ref={padRef}
        class="point-pad"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          updateFromEvent(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) updateFromEvent(e);
        }}
      >
        <div class="point-axis x" />
        <div class="point-axis y" />
        <div
          class="point-dot"
          style={{
            left: `${((props.x + 1) / 2) * 100}%`,
            top: `${((1 - props.y) / 2) * 100}%`,
          }}
        />
      </div>
      <div class="point-labels">
        <span>{props.xLabel ?? "X"} {props.x.toFixed(2)}</span>
        <span>{props.yLabel ?? "Y"} {props.y.toFixed(2)}</span>
      </div>
    </div>
  );
}

function CurveEditor(props: {
  label: string;
  curve: { points: { x: number; y: number }[]; interpolation: string; pointCount: number };
  hueMode?: boolean;
  lineColor?: string;
  onPointChange: (index: number, point: { x: number; y: number }) => void;
  onPointCountChange: (count: number) => void;
  onInterpolationToggle: () => void;
}) {
  const path = () =>
    props.curve.points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x * 100} ${(1 - p.y) * 100}`)
      .join(" ");

  return (
    <div class="curve-editor">
      <div class={`curve-box ${props.hueMode ? "hue" : ""}`}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d={path()} stroke={props.lineColor ?? "rgba(226,226,233,.85)"} />
        </svg>
        <For each={props.curve.points}>
          {(point, index) => (
            <div
              class="curve-point"
              style={{
                left: `${point.x * 100}%`,
                top: `${(1 - point.y) * 100}%`,
              }}
              title={`${props.label} point ${index() + 1}`}
            />
          )}
        </For>
      </div>
      <div class="curve-point-list">
        <For each={props.curve.points}>
          {(point, index) => (
            <div class="curve-point-row">
              <span>{index() + 1}</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={point.x}
                onInput={(e) =>
                  props.onPointChange(index(), {
                    x: parseFloat(e.currentTarget.value),
                    y: point.y,
                  })
                }
              />
              <input
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={point.y}
                onInput={(e) =>
                  props.onPointChange(index(), {
                    x: point.x,
                    y: parseFloat(e.currentTarget.value),
                  })
                }
              />
            </div>
          )}
        </For>
      </div>
      <div class="curve-actions">
        <label>
          Points
          <input
            type="number"
            min="2"
            max="7"
            step="1"
            value={props.curve.pointCount}
            onInput={(e) => props.onPointCountChange(parseInt(e.currentTarget.value, 10))}
          />
        </label>
        <button type="button" onClick={props.onInterpolationToggle}>
          {props.curve.interpolation}
        </button>
      </div>
    </div>
  );
}

import { PresetsPanel } from "./PresetsPanel";
import { MatchPanel } from "./MatchPanel";

export function Sidebar() {
  // FIX: applySnapshot and deleteSnapshot were missing from destructuring
  const {
    ui,
    togglePanel,
    setEdit,
    editState,
    saveSnapshot,
    applySnapshot,
    deleteSnapshot,
    resetPanel,
    activeMedia,
    showToast,
  } = useColorIO();

  const isOpen = (id: string) => ui().openPanels.has(id);

  // ── Panel change handlers ──────────────────────────────────────────────────
  const handleBalanceChange = (key: string, value: number) => {
    setEdit((s) => {
      (s.balance as any)[key] = value;
    }, `Balance ${key}`);
  };
  const handleBalanceBypass = () => {
    setEdit((s) => {
      s.balance.bypass = !s.balance.bypass;
    }, "Balance bypass");
  };

  const handleRGBChange = (key: string, value: number) => {
    setEdit((s) => {
      (s.rgb as any)[key] = value;
    }, `RGB ${key}`);
  };
  const handleRGBBypass = () => {
    setEdit((s) => {
      s.rgb.bypass = !s.rgb.bypass;
    }, "RGB bypass");
  };

  const handleTextureChange = (key: string, value: number) => {
    setEdit((s) => {
      (s.texture as any)[key] = value;
    }, `Texture ${key}`);
  };
  const handleTextureBypass = () => {
    setEdit((s) => {
      s.texture.bypass = !s.texture.bypass;
    }, "Texture bypass");
  };

  const handleSpotlightChange = (key: string, value: number) => {
    setEdit((s) => {
      (s.spotlight as any)[key] = value;
    }, `Spotlight ${key}`);
  };
  const handleSpotlightBypass = () => {
    setEdit((s) => {
      s.spotlight.bypass = !s.spotlight.bypass;
    }, "Spotlight bypass");
  };

  const handleHalationChange = (key: string, value: number) => {
    setEdit((s) => {
      (s.halation as any)[key] = value;
    }, `Halation ${key}`);
  };
  const handleHalationBypass = () => {
    setEdit((s) => {
      s.halation.bypass = !s.halation.bypass;
    }, "Halation bypass");
  };

  const handleDiffusionChange = (key: string, value: number) => {
    setEdit((s) => {
      (s.diffusion as any)[key] = value;
    }, `Diffusion ${key}`);
  };
  const handleDiffusionBypass = () => {
    setEdit((s) => {
      s.diffusion.bypass = !s.diffusion.bypass;
    }, "Diffusion bypass");
  };

  const handlePanelBypass = (panel: keyof ReturnType<typeof editState>) => {
    setEdit((s) => {
      const section = s[panel] as any;
      if (section && "bypass" in section) section.bypass = !section.bypass;
    }, `${String(panel)} bypass`);
  };

  const handleCurvePointChange = (
    panel: "exposure" | "contrast" | "density" | "chroma" | "radiance" | "saturation",
    index: number,
    point: { x: number; y: number },
  ) => {
    setEdit((s) => {
      s[panel].curve.points[index] = point;
    }, `${panel} curve`);
  };

  const handleCurvePointCount = (
    panel: "exposure" | "contrast" | "density" | "chroma" | "radiance" | "saturation",
    count: number,
  ) => {
    const nextCount = Math.max(2, Math.min(7, Number.isFinite(count) ? count : 2));
    setEdit((s) => {
      const old = s[panel].curve.points;
      s[panel].curve.points = Array.from({ length: nextCount }, (_, i) => {
        if (old[i]) return old[i];
        const x = i / (nextCount - 1);
        return { x, y: panel === "density" || panel === "radiance" ? 0.5 : x };
      });
      s[panel].curve.pointCount = nextCount;
    }, `${panel} point count`);
  };

  const handleCurveInterpolation = (
    panel: "exposure" | "contrast" | "density" | "chroma" | "radiance" | "saturation",
  ) => {
    setEdit((s) => {
      s[panel].curve.interpolation =
        s[panel].curve.interpolation.toLowerCase() === "cubic" ? "Bezier" : "cubic";
    }, `${panel} interpolation`);
  };

  // ── Snapshot ───────────────────────────────────────────────────────────────
  const handleSaveSnapshot = () => {
    const name = prompt("Snapshot name:")?.trim();
    if (name) {
      saveSnapshot(name);
    }
  };

  return (
    <aside class="sidebar">
      <style>{`
        .sidebar {
          width: 280px;
          flex-shrink: 0;
          background: rgb(35, 35, 42);
          border-left: 1px solid rgba(255,255,255,0.05);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .sidebar-header {
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }
        .sidebar-title {
          font-size: 13px;
          font-weight: 600;
          flex: 1;
        }
        .snapshot-btn {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background: none;
          border: none;
          color: rgba(226, 226, 233, 0.6);
          transition: all 120ms;
        }
        .snapshot-btn:hover {
          background: rgba(255,255,255,0.08);
          color: rgb(226, 226, 233);
        }
        .panels-container {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.08) transparent;
        }
        .panels-container::-webkit-scrollbar { width: 4px; }
        .panels-container::-webkit-scrollbar-track { background: transparent; }
        .panels-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .panel-section {
          margin-bottom: 4px;
        }
        .panel-section.bypassed .panel-content {
          opacity: 0.35;
          pointer-events: none;
        }
        .panel-header {
          width: 100%;
          height: 36px;
          padding: 0 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.03);
          border: none;
          border-radius: 6px;
          color: rgb(226, 226, 233);
          cursor: pointer;
          transition: background 120ms;
        }
        .panel-header:hover {
          background: rgba(255,255,255,0.06);
        }
        .panel-icon {
          width: 16px;
          height: 16px;
          opacity: 0.7;
          flex-shrink: 0;
        }
        .panel-title {
          flex: 1;
          font-size: 12px;
          font-weight: 500;
          text-align: left;
        }
        .panel-bypass-btn,
        .panel-reset-btn {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(226, 226, 233, 0.3);
          transition: all 120ms;
          flex-shrink: 0;
        }
        .panel-bypass-btn:hover { color: rgba(226, 226, 233, 0.8); background: rgba(255,255,255,0.06); }
        .panel-bypass-btn.active { color: #f0854d; }
        .panel-reset-btn:hover { color: rgba(226, 226, 233, 0.8); background: rgba(255,255,255,0.06); }
        .chevron {
          transition: transform 200ms;
          color: rgba(226, 226, 233, 0.4);
          flex-shrink: 0;
        }
        .chevron.open {
          transform: rotate(180deg);
        }
        .panel-content {
          padding: 12px;
          animation: slide-down 180ms ease-out;
          transition: opacity 120ms;
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── Value slider ───────────────────────────────────────────────────── */
        .value-slider {
          display: grid;
          grid-template-columns: 80px 1fr 40px;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }
        .slider-label {
          font-size: 11px;
          opacity: 0.6;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .slider-track-wrapper {
          position: relative;
          height: 20px;
          display: flex;
          align-items: center;
        }
        .slider-input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
          margin: 0;
          z-index: 1;
        }
        .slider-track {
          width: 100%;
          height: 4px;
          background: rgba(255,255,255,0.08);
          border-radius: 2px;
          overflow: hidden;
          pointer-events: none;
        }
        .slider-fill {
          height: 100%;
          background: #4d8af0;
          border-radius: 2px;
          transition: width 30ms linear;
        }
        .slider-value {
          font-size: 10px;
          opacity: 0.45;
          text-align: right;
          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum";
        }

        /* ── Section divider ────────────────────────────────────────────────── */
        .section-divider {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          opacity: 0.35;
          margin: 14px 0 8px;
          padding-bottom: 4px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .section-divider:first-child { margin-top: 0; }

        .point-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .point-control {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .point-readout,
        .point-labels {
          display: flex;
          justify-content: space-between;
          gap: 6px;
          font-size: 10px;
          color: rgba(226, 226, 233, 0.5);
          font-variant-numeric: tabular-nums;
        }
        .point-readout span:first-child {
          color: rgba(226, 226, 233, 0.75);
          font-weight: 600;
        }
        .point-pad {
          position: relative;
          aspect-ratio: 1;
          border-radius: 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          overflow: hidden;
          cursor: crosshair;
          touch-action: none;
        }
        .point-axis {
          position: absolute;
          background: rgba(255,255,255,0.08);
          pointer-events: none;
        }
        .point-axis.x { left: 0; right: 0; top: 50%; height: 1px; }
        .point-axis.y { top: 0; bottom: 0; left: 50%; width: 1px; }
        .point-dot {
          position: absolute;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: rgb(226, 226, 233);
          border: 2px solid rgb(35, 35, 42);
          transform: translate(-50%, -50%);
          box-shadow: 0 2px 8px rgba(0,0,0,.35);
          pointer-events: none;
        }
        .curve-editor {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .curve-box {
          position: relative;
          height: 132px;
          border-radius: 8px;
          background: linear-gradient(135deg, #242424, #cccccc);
          border: 1px solid rgba(255,255,255,0.08);
          overflow: hidden;
        }
        .curve-box.hue {
          background: linear-gradient(90deg, #e5484d, #f5d90a, #46c263, #29a8ff, #8f5cff, #e5484d);
        }
        .curve-box svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .curve-box path {
          fill: none;
          stroke-width: 2.5;
          vector-effect: non-scaling-stroke;
        }
        .curve-point {
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: rgb(226, 226, 233);
          border: 2px solid rgb(35, 35, 42);
          transform: translate(-50%, -50%);
          box-shadow: 0 2px 8px rgba(0,0,0,.35);
        }
        .curve-point-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .curve-point-row {
          display: grid;
          grid-template-columns: 18px 1fr 1fr;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          color: rgba(226,226,233,.5);
        }
        .curve-point-row input {
          min-width: 0;
        }
        .curve-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .curve-actions label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          color: rgba(226,226,233,.5);
        }
        .curve-actions input {
          width: 48px;
          height: 24px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,.1);
          background: rgba(255,255,255,.04);
          color: rgb(226,226,233);
        }
        .curve-actions button,
        .small-action {
          height: 24px;
          padding: 0 8px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.05);
          color: rgba(226,226,233,.75);
          font-size: 10px;
          cursor: pointer;
        }
        .render-note {
          font-size: 10px;
          font-style: italic;
          opacity: 0.3;
          text-align: center;
          margin-top: 4px;
        }

        /* ── Snapshots ──────────────────────────────────────────────────────── */
        .snapshots-list {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .snapshot-item {
          padding: 7px 10px;
          background: rgba(255,255,255,0.03);
          border-radius: 5px;
          font-size: 11px;
          cursor: pointer;
          transition: background 120ms;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          border: 1px solid transparent;
        }
        .snapshot-item:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.05);
        }
        .snapshot-item:active {
          background: rgba(77, 138, 240, 0.12);
          border-color: rgba(77, 138, 240, 0.25);
        }
        .snapshot-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .snapshot-date {
          font-size: 10px;
          opacity: 0.35;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .snapshot-delete {
          width: 18px;
          height: 18px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          opacity: 0;
          transition: opacity 120ms;
          font-size: 14px;
          line-height: 1;
          color: rgba(226, 226, 233, 0.5);
          cursor: pointer;
        }
        .snapshot-item:hover .snapshot-delete {
          opacity: 1;
        }
        .snapshot-delete:hover {
          color: #ff5c5c;
          background: rgba(255, 92, 92, 0.1);
        }
        .empty-snapshots {
          font-size: 11px;
          opacity: 0.3;
          text-align: center;
          padding: 16px 0;
        }
      `}</style>

      <div class="sidebar-header">
        <span class="sidebar-title">Adjustments</span>
        <button
          class="snapshot-btn"
          onClick={handleSaveSnapshot}
          title="Save Snapshot (⌘S)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 3v8M3 7h8"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <div class="panels-container">
        {/* ── Presets ─────────────────────────────────────────────────────── */}
        <PanelSection
          id="presets"
          title="Presets"
          icon="/assets/icons/presets_icon.svg"
          isOpen={isOpen("presets")}
          onToggle={() => togglePanel("presets")}
        >
          <PresetsPanel />
        </PanelSection>

        {/* ── Match ───────────────────────────────────────────────────────── */}
        <PanelSection
          id="match"
          title="Match"
          icon="/assets/icons/match_icon.svg"
          isOpen={isOpen("match")}
          onToggle={() => togglePanel("match")}
        >
          <MatchPanel />
        </PanelSection>

        {/* ── Balance ─────────────────────────────────────────────────────── */}
        <PanelSection
          id="balance"
          title="Balance"
          icon="/assets/icons/balance_icon.svg"
          isOpen={isOpen("balance")}
          bypassed={editState().balance.bypass}
          onToggle={() => togglePanel("balance")}
          onBypassToggle={handleBalanceBypass}
          onReset={() => resetPanel("balance")}
        >
          <ValueSlider
            label="Exposure"
            value={editState().balance.exposure}
            min={-3}
            max={3}
            onChange={(v) => handleBalanceChange("exposure", v)}
          />
          <ValueSlider
            label="Saturation"
            value={editState().balance.saturation}
            min={-1}
            max={1}
            onChange={(v) => handleBalanceChange("saturation", v)}
          />
          <ValueSlider
            label="Temperature"
            value={editState().balance.temperature}
            min={-1}
            max={1}
            onChange={(v) => handleBalanceChange("temperature", v)}
          />
          <ValueSlider
            label="Tint"
            value={editState().balance.tint}
            min={-1}
            max={1}
            onChange={(v) => handleBalanceChange("tint", v)}
          />
        </PanelSection>

        {/* ── RGB ─────────────────────────────────────────────────────────── */}
        <PanelSection
          id="exposure"
          title="Exposure Curve"
          icon="/assets/icons/brightness_contrast_icon.svg"
          isOpen={isOpen("exposure")}
          bypassed={editState().exposure.bypass}
          onToggle={() => togglePanel("exposure")}
          onBypassToggle={() => handlePanelBypass("exposure")}
          onReset={() => resetPanel("exposure")}
        >
          <CurveEditor
            label="Exposure"
            curve={editState().exposure.curve}
            onPointChange={(i, p) => handleCurvePointChange("exposure", i, p)}
            onPointCountChange={(count) => handleCurvePointCount("exposure", count)}
            onInterpolationToggle={() => handleCurveInterpolation("exposure")}
          />
        </PanelSection>

        <PanelSection
          id="contrast"
          title="Contrast Curve"
          icon="/assets/icons/luminance_curve_icon.svg"
          isOpen={isOpen("contrast")}
          bypassed={editState().contrast.bypass}
          onToggle={() => togglePanel("contrast")}
          onBypassToggle={() => handlePanelBypass("contrast")}
          onReset={() => resetPanel("contrast")}
        >
          <CurveEditor
            label="Contrast"
            curve={editState().contrast.curve}
            onPointChange={(i, p) => handleCurvePointChange("contrast", i, p)}
            onPointCountChange={(count) => handleCurvePointCount("contrast", count)}
            onInterpolationToggle={() => handleCurveInterpolation("contrast")}
          />
          <ValueSlider
            label="Smart"
            value={editState().contrast.smartContrast}
            min={0}
            max={1}
            onChange={(v) =>
              setEdit((s) => {
                s.contrast.smartContrast = v;
              }, "Smart Contrast")
            }
          />
        </PanelSection>

        <PanelSection
          id="scattering"
          title="Scattering"
          icon="/assets/icons/scatter_icon.svg"
          isOpen={isOpen("scattering")}
          bypassed={editState().scattering.bypass}
          onToggle={() => togglePanel("scattering")}
          onBypassToggle={() => handlePanelBypass("scattering")}
          onReset={() => resetPanel("scattering")}
        >
          <div class="point-grid">
            <PointPad
              label="Shadows"
              x={editState().scattering.shadows.x}
              y={editState().scattering.shadows.y}
              onChange={(point) =>
                setEdit((s) => {
                  s.scattering.shadows = point;
                }, "Scattering Shadows")
              }
            />
            <PointPad
              label="Highlights"
              x={editState().scattering.highlights.x}
              y={editState().scattering.highlights.y}
              onChange={(point) =>
                setEdit((s) => {
                  s.scattering.highlights = point;
                }, "Scattering Highlights")
              }
            />
          </div>
        </PanelSection>

        <PanelSection
          id="refraction"
          title="Refraction"
          icon="/assets/icons/refract_icon.svg"
          isOpen={isOpen("refraction")}
          bypassed={editState().refraction.bypass}
          onToggle={() => togglePanel("refraction")}
          onBypassToggle={() => handlePanelBypass("refraction")}
          onReset={() => resetPanel("refraction")}
        >
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
              setEdit((s) => {
                s.refraction.threshold = v;
              }, "Refraction Threshold")
            }
          />
          <button
            type="button"
            class="small-action"
            onClick={() =>
              setEdit((s) => {
                s.refraction.linked = !s.refraction.linked;
              }, "Refraction Link")
            }
          >
            {editState().refraction.linked ? "Linked" : "Unlinked"}
          </button>
        </PanelSection>

        <PanelSection
          id="density"
          title="Density Curve"
          icon="/assets/icons/density_vs_hue_icon.svg"
          isOpen={isOpen("density")}
          bypassed={editState().density.bypass}
          onToggle={() => togglePanel("density")}
          onBypassToggle={() => handlePanelBypass("density")}
          onReset={() => resetPanel("density")}
        >
          <CurveEditor
            label="Density"
            curve={editState().density.curve}
            hueMode
            lineColor="rgba(255,255,255,.9)"
            onPointChange={(i, p) => handleCurvePointChange("density", i, p)}
            onPointCountChange={(count) => handleCurvePointCount("density", count)}
            onInterpolationToggle={() => handleCurveInterpolation("density")}
          />
        </PanelSection>

        <PanelSection
          id="chroma"
          title="Chroma Curve"
          icon="/assets/icons/chroma_icon.svg"
          isOpen={isOpen("chroma")}
          bypassed={editState().chroma.bypass}
          onToggle={() => togglePanel("chroma")}
          onBypassToggle={() => handlePanelBypass("chroma")}
          onReset={() => resetPanel("chroma")}
        >
          <CurveEditor
            label="Chroma"
            curve={editState().chroma.curve}
            lineColor="rgba(255,200,100,.9)"
            onPointChange={(i, p) => handleCurvePointChange("chroma", i, p)}
            onPointCountChange={(count) => handleCurvePointCount("chroma", count)}
            onInterpolationToggle={() => handleCurveInterpolation("chroma")}
          />
        </PanelSection>

        <PanelSection
          id="radiance"
          title="Radiance Curve"
          icon="/assets/icons/radiance_curve_icon.svg"
          isOpen={isOpen("radiance")}
          bypassed={editState().radiance.bypass}
          onToggle={() => togglePanel("radiance")}
          onBypassToggle={() => handlePanelBypass("radiance")}
          onReset={() => resetPanel("radiance")}
        >
          <CurveEditor
            label="Radiance"
            curve={editState().radiance.curve}
            hueMode
            lineColor="rgba(255,255,180,.9)"
            onPointChange={(i, p) => handleCurvePointChange("radiance", i, p)}
            onPointCountChange={(count) => handleCurvePointCount("radiance", count)}
            onInterpolationToggle={() => handleCurveInterpolation("radiance")}
          />
        </PanelSection>

        <PanelSection
          id="saturation"
          title="Saturation Curve"
          icon="/assets/icons/saturation_icon.svg"
          isOpen={isOpen("saturation")}
          bypassed={editState().saturation.bypass}
          onToggle={() => togglePanel("saturation")}
          onBypassToggle={() => handlePanelBypass("saturation")}
          onReset={() => resetPanel("saturation")}
        >
          <CurveEditor
            label="Saturation"
            curve={editState().saturation.curve}
            lineColor="rgba(100,200,255,.9)"
            onPointChange={(i, p) => handleCurvePointChange("saturation", i, p)}
            onPointCountChange={(count) => handleCurvePointCount("saturation", count)}
            onInterpolationToggle={() => handleCurveInterpolation("saturation")}
          />
        </PanelSection>

        <PanelSection
          id="rgb"
          title="Shadow Highlight"
          icon="/assets/icons/sliders_icon.svg"
          isOpen={isOpen("rgb")}
          bypassed={editState().rgb.bypass}
          onToggle={() => togglePanel("rgb")}
          onBypassToggle={handleRGBBypass}
          onReset={() => resetPanel("rgb")}
        >
          <div class="section-divider">Shadows</div>
          <ValueSlider
            label="Red"
            value={editState().rgb.shadowR}
            onChange={(v) => handleRGBChange("shadowR", v)}
          />
          <ValueSlider
            label="Green"
            value={editState().rgb.shadowG}
            onChange={(v) => handleRGBChange("shadowG", v)}
          />
          <ValueSlider
            label="Blue"
            value={editState().rgb.shadowB}
            onChange={(v) => handleRGBChange("shadowB", v)}
          />
          <div class="section-divider">Highlights</div>
          <ValueSlider
            label="Red"
            value={editState().rgb.highlightR}
            onChange={(v) => handleRGBChange("highlightR", v)}
          />
          <ValueSlider
            label="Green"
            value={editState().rgb.highlightG}
            onChange={(v) => handleRGBChange("highlightG", v)}
          />
          <ValueSlider
            label="Blue"
            value={editState().rgb.highlightB}
            onChange={(v) => handleRGBChange("highlightB", v)}
          />
        </PanelSection>

        {/* ── Texture ─────────────────────────────────────────────────────── */}
        <PanelSection
          id="texture"
          title="Texture"
          icon="/assets/icons/grain_icon.svg"
          isOpen={isOpen("texture")}
          bypassed={editState().texture.bypass}
          onToggle={() => togglePanel("texture")}
          onBypassToggle={handleTextureBypass}
          onReset={() => resetPanel("texture")}
        >
          <ValueSlider
            label="Grain"
            value={editState().texture.grainAmount}
            min={0}
            max={1}
            onChange={(v) => handleTextureChange("grainAmount", v)}
          />
          <ValueSlider
            label="Chroma"
            value={editState().texture.grainChroma}
            min={0}
            max={1}
            onChange={(v) => handleTextureChange("grainChroma", v)}
          />
          <ValueSlider
            label="Acutance"
            value={editState().texture.acutance}
            min={-1}
            max={1}
            onChange={(v) => handleTextureChange("acutance", v)}
          />
          <ValueSlider
            label="Resolution"
            value={editState().texture.resolution}
            min={-1}
            max={1}
            onChange={(v) => handleTextureChange("resolution", v)}
          />
          <p class="render-note">Render-only · Not included in LUT exports</p>
        </PanelSection>

        {/* ── Spotlight ───────────────────────────────────────────────────── */}
        <PanelSection
          id="spotlight"
          title="Spotlight"
          icon="/assets/icons/relight_icon.svg"
          isOpen={isOpen("spotlight")}
          bypassed={editState().spotlight.bypass}
          onToggle={() => togglePanel("spotlight")}
          onBypassToggle={handleSpotlightBypass}
          onReset={() => resetPanel("spotlight")}
        >
          <ValueSlider
            label="Amount"
            value={editState().spotlight.amount}
            min={0}
            max={1}
            onChange={(v) => handleSpotlightChange("amount", v)}
          />
          <ValueSlider
            label="Focus"
            value={editState().spotlight.focus}
            min={0}
            max={1}
            onChange={(v) => handleSpotlightChange("focus", v)}
          />
          <ValueSlider
            label="Pop"
            value={editState().spotlight.pop}
            min={0}
            max={1}
            onChange={(v) => handleSpotlightChange("pop", v)}
          />
          <ValueSlider
            label="Bias"
            value={editState().spotlight.bias}
            min={-1}
            max={1}
            onChange={(v) => handleSpotlightChange("bias", v)}
          />
          <p class="render-note">Render-only · Not included in LUT exports</p>
        </PanelSection>

        {/* ── Halation ────────────────────────────────────────────────────── */}
        <PanelSection
          id="halation"
          title="Halation"
          icon="/assets/icons/halation_icon.svg"
          isOpen={isOpen("halation")}
          bypassed={editState().halation.bypass}
          onToggle={() => togglePanel("halation")}
          onBypassToggle={handleHalationBypass}
          onReset={() => resetPanel("halation")}
        >
          <ValueSlider
            label="Amount"
            value={editState().halation.amount}
            min={0}
            max={1}
            onChange={(v) => handleHalationChange("amount", v)}
          />
          <ValueSlider
            label="Spill"
            value={editState().halation.lightSpill}
            min={0}
            max={1}
            onChange={(v) => handleHalationChange("lightSpill", v)}
          />
          <ValueSlider
            label="Shift"
            value={editState().halation.colorShift}
            min={-1}
            max={1}
            onChange={(v) => handleHalationChange("colorShift", v)}
          />
          <ValueSlider
            label="Saturation"
            value={editState().halation.saturation}
            min={0}
            max={2}
            onChange={(v) => handleHalationChange("saturation", v)}
          />
        </PanelSection>

        {/* ── Diffusion ───────────────────────────────────────────────────── */}
        <PanelSection
          id="diffusion"
          title="Diffusion"
          icon="/assets/icons/diffusion_icon.svg"
          isOpen={isOpen("diffusion")}
          bypassed={editState().diffusion.bypass}
          onToggle={() => togglePanel("diffusion")}
          onBypassToggle={handleDiffusionBypass}
          onReset={() => resetPanel("diffusion")}
        >
          <ValueSlider
            label="Amount"
            value={editState().diffusion.amount}
            min={0}
            max={1}
            onChange={(v) => handleDiffusionChange("amount", v)}
          />
          <ValueSlider
            label="Fog"
            value={editState().diffusion.fog}
            min={0}
            max={1}
            onChange={(v) => handleDiffusionChange("fog", v)}
          />
          <ValueSlider
            label="Threshold"
            value={editState().diffusion.threshold}
            min={0}
            max={1}
            onChange={(v) => handleDiffusionChange("threshold", v)}
          />
          <ValueSlider
            label="Focus"
            value={editState().diffusion.focus}
            min={0}
            max={1}
            onChange={(v) => handleDiffusionChange("focus", v)}
          />
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
        </PanelSection>

        {/* ── Snapshots ───────────────────────────────────────────────────── */}
        <PanelSection
          id="snapshots"
          title="Snapshots"
          icon="/assets/icons/save_icon.svg"
          isOpen={isOpen("snapshots")}
          onToggle={() => togglePanel("snapshots")}
        >
          <div class="snapshots-list">
            <Show
              when={(activeMedia()?.snapshots?.length ?? 0) > 0}
              fallback={
                <div class="empty-snapshots">
                  No snapshots yet — press ⌘S to save one
                </div>
              }
            >
              <For each={activeMedia()?.snapshots ?? []}>
                {(snap) => (
                  <div
                    class="snapshot-item"
                    // FIX: was () => {} — now actually applies the snapshot
                    onClick={() => applySnapshot(snap.id)}
                    title={`Apply "${snap.name}"`}
                  >
                    <span class="snapshot-name">{snap.name}</span>
                    <span class="snapshot-date">
                      {new Date(snap.date).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {/* FIX: was never calling deleteSnapshot */}
                    <span
                      class="snapshot-delete"
                      title="Delete snapshot"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSnapshot(snap.id);
                      }}
                    >
                      ×
                    </span>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </PanelSection>
      </div>
    </aside>
  );
}
