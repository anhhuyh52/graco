import { Show, For } from "solid-js";
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
  variant?: "default" | "balance-left" | "balance-right";
  onChange: (point: { x: number; y: number }) => void;
}) {
  let padRef: HTMLDivElement | undefined;
  let dragging = false;

  const updateFromClient = (clientX: number, clientY: number) => {
    if (!padRef) return;
    const rect = padRef.getBoundingClientRect();
    const x = Math.max(
      -1,
      Math.min(1, ((clientX - rect.left) / rect.width) * 2 - 1),
    );
    const y = Math.max(
      -1,
      Math.min(1, 1 - ((clientY - rect.top) / rect.height) * 2),
    );
    props.onChange({ x, y });
  };

  const startDrag = (clientX: number, clientY: number) => {
    dragging = true;
    updateFromClient(clientX, clientY);

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging) return;
      updateFromClient(ev.clientX, ev.clientY);
    };
    const onMouseUp = () => {
      dragging = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
    const onTouchMove = (ev: TouchEvent) => {
      if (!dragging) return;
      const t = ev.touches[0];
      if (!t) return;
      ev.preventDefault();
      updateFromClient(t.clientX, t.clientY);
    };
    const onTouchEnd = () => onMouseUp();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
  };

  return (
    <div class="point-control">
      <div class="point-readout">
        <span>{props.label}</span>
      </div>
      <div
        ref={padRef}
        class={`point-pad ${props.variant ?? "default"}`}
        onMouseDown={(e) => {
          e.preventDefault();
          startDrag(e.clientX, e.clientY);
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (!t) return;
          e.preventDefault();
          startDrag(t.clientX, t.clientY);
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
    </div>
  );
}

const clampUnit = (value: number) => Math.max(0, Math.min(1, value));

const curveSvgPoint = (point: { x: number; y: number }) =>
  `${clampUnit(point.x) * 100} ${(1 - clampUnit(point.y)) * 100}`;

const averageCurveY = (points: { x: number; y: number }[]) =>
  points.length
    ? points.reduce((sum, point) => sum + clampUnit(point.y), 0) / points.length
    : 0.5;

const interpolationIcon = (interpolation: string) => {
  const mode = interpolation.trim().toLowerCase();
  if (mode === "bezier") return "/assets/icons/bezier_icon.svg";
  if (mode === "linear") return "/assets/icons/linear_icon.svg";
  return "/assets/icons/cubic_icon.svg";
};

const capitalizedInterpolation = (interpolation: string) => {
  const mode = interpolation.trim().toLowerCase() || "cubic";
  return mode.charAt(0).toUpperCase() + mode.slice(1);
};

function normalizedCurvePoints(points: { x: number; y: number }[]) {
  const sorted = [...points]
    .map((p) => ({ x: clampUnit(p.x), y: clampUnit(p.y) }))
    .sort((a, b) => a.x - b.x);

  return sorted.filter((point, index, arr) => {
    const next = arr[index + 1];
    return !next || Math.abs(point.x - next.x) > 0.0001;
  });
}

function linearCurvePath(points: { x: number; y: number }[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${curveSvgPoint(point)}`)
    .join(" ");
}

function bezierCurvePath(points: { x: number; y: number }[]) {
  if (points.length < 2) return "";
  let path = `M ${curveSvgPoint(points[0])}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const prev = points[i - 1] ?? points[i];
    const current = points[i];
    const next = points[i + 1];
    const after = points[i + 2] ?? next;
    const c1 = {
      x: current.x + (next.x - prev.x) / 6,
      y: current.y + (next.y - prev.y) / 6,
    };
    const c2 = {
      x: next.x - (after.x - current.x) / 6,
      y: next.y - (after.y - current.y) / 6,
    };

    path += ` C ${curveSvgPoint(c1)} ${curveSvgPoint(c2)} ${curveSvgPoint(next)}`;
  }

  return path;
}

function cubicSplinePath(points: { x: number; y: number }[]) {
  if (points.length < 3) return linearCurvePath(points);

  const n = points.length;
  const a = points.map((p) => p.y);
  const h = Array.from({ length: n - 1 }, (_, i) =>
    Math.max(0.0001, points[i + 1].x - points[i].x),
  );
  const alpha = Array(n).fill(0);

  for (let i = 1; i < n - 1; i += 1) {
    alpha[i] =
      (3 / h[i]) * (a[i + 1] - a[i]) - (3 / h[i - 1]) * (a[i] - a[i - 1]);
  }

  const l = Array(n).fill(1);
  const mu = Array(n).fill(0);
  const z = Array(n).fill(0);
  const c = Array(n).fill(0);
  const b = Array(n - 1).fill(0);
  const d = Array(n - 1).fill(0);

  for (let i = 1; i < n - 1; i += 1) {
    l[i] = 2 * (points[i + 1].x - points[i - 1].x) - h[i - 1] * mu[i - 1];
    mu[i] = h[i] / l[i];
    z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
  }

  for (let j = n - 2; j >= 0; j -= 1) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (a[j + 1] - a[j]) / h[j] - (h[j] * (c[j + 1] + 2 * c[j])) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }

  const samples: { x: number; y: number }[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    const steps = Math.max(8, Math.round(h[i] * 80));
    for (let step = 0; step <= steps; step += 1) {
      if (i > 0 && step === 0) continue;
      const x = points[i].x + (h[i] * step) / steps;
      const dx = x - points[i].x;
      samples.push({
        x,
        y: clampUnit(a[i] + b[i] * dx + c[i] * dx * dx + d[i] * dx * dx * dx),
      });
    }
  }

  return linearCurvePath(samples);
}

function evaluateLinearCurve(points: { x: number; y: number }[], x: number) {
  if (!points.length) return 0.5;
  if (x <= points[0].x) return points[0].y;
  if (x >= points[points.length - 1].x) return points[points.length - 1].y;

  for (let i = 0; i < points.length - 1; i += 1) {
    const left = points[i];
    const right = points[i + 1];
    if (x >= left.x && x <= right.x) {
      const t = (x - left.x) / Math.max(0.0001, right.x - left.x);
      return clampUnit(left.y + (right.y - left.y) * t);
    }
  }

  return 0.5;
}

function evaluateBezierCurve(points: { x: number; y: number }[], x: number) {
  if (points.length < 2) return points[0]?.y ?? 0.5;

  for (let i = 0; i < points.length - 1; i += 1) {
    const prev = points[i - 1] ?? points[i];
    const current = points[i];
    const next = points[i + 1];
    const after = points[i + 2] ?? next;

    if (x < current.x || x > next.x) continue;

    const c1 = {
      x: current.x + (next.x - prev.x) / 6,
      y: current.y + (next.y - prev.y) / 6,
    };
    const c2 = {
      x: next.x - (after.x - current.x) / 6,
      y: next.y - (after.y - current.y) / 6,
    };

    let lo = 0;
    let hi = 1;
    for (let step = 0; step < 18; step += 1) {
      const t = (lo + hi) / 2;
      const mt = 1 - t;
      const bx =
        mt * mt * mt * current.x +
        3 * mt * mt * t * c1.x +
        3 * mt * t * t * c2.x +
        t * t * t * next.x;
      if (bx < x) lo = t;
      else hi = t;
    }

    const t = (lo + hi) / 2;
    const mt = 1 - t;
    return clampUnit(
      mt * mt * mt * current.y +
        3 * mt * mt * t * c1.y +
        3 * mt * t * t * c2.y +
        t * t * t * next.y,
    );
  }

  return evaluateLinearCurve(points, x);
}

function evaluateCubicCurve(points: { x: number; y: number }[], x: number) {
  if (points.length < 3) return evaluateLinearCurve(points, x);
  if (x <= points[0].x) return points[0].y;
  if (x >= points[points.length - 1].x) return points[points.length - 1].y;

  const n = points.length;
  const a = points.map((p) => p.y);
  const h = Array.from({ length: n - 1 }, (_, i) =>
    Math.max(0.0001, points[i + 1].x - points[i].x),
  );
  const alpha = Array(n).fill(0);

  for (let i = 1; i < n - 1; i += 1) {
    alpha[i] =
      (3 / h[i]) * (a[i + 1] - a[i]) - (3 / h[i - 1]) * (a[i] - a[i - 1]);
  }

  const l = Array(n).fill(1);
  const mu = Array(n).fill(0);
  const z = Array(n).fill(0);
  const c = Array(n).fill(0);
  const b = Array(n - 1).fill(0);
  const d = Array(n - 1).fill(0);

  for (let i = 1; i < n - 1; i += 1) {
    l[i] = 2 * (points[i + 1].x - points[i - 1].x) - h[i - 1] * mu[i - 1];
    mu[i] = h[i] / l[i];
    z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
  }

  for (let j = n - 2; j >= 0; j -= 1) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (a[j + 1] - a[j]) / h[j] - (h[j] * (c[j + 1] + 2 * c[j])) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }

  const segment = Math.max(
    0,
    Math.min(
      n - 2,
      points.findIndex(
        (point, index) =>
          index < n - 1 && x >= point.x && x <= points[index + 1].x,
      ),
    ),
  );
  const dx = x - points[segment].x;
  return clampUnit(
    a[segment] +
      b[segment] * dx +
      c[segment] * dx * dx +
      d[segment] * dx * dx * dx,
  );
}

function evaluateCurveY(
  points: { x: number; y: number }[],
  interpolation: string,
  x: number,
) {
  const normalized = normalizedCurvePoints(points);
  const mode = interpolation.trim().toLowerCase();
  if (mode === "linear") return evaluateLinearCurve(normalized, clampUnit(x));
  if (mode === "bezier") return evaluateBezierCurve(normalized, clampUnit(x));
  return evaluateCubicCurve(normalized, clampUnit(x));
}

function curvePath(points: { x: number; y: number }[], interpolation: string) {
  const normalized = normalizedCurvePoints(points);
  if (!normalized.length) return "";
  const mode = interpolation.trim().toLowerCase();
  if (mode === "linear") return linearCurvePath(normalized);
  if (mode === "bezier") return bezierCurvePath(normalized);
  return cubicSplinePath(normalized);
}

function CurveEditor(props: {
  label: string;
  curve: {
    points: { x: number; y: number }[];
    interpolation: string;
    pointCount: number;
  };
  hueMode?: boolean;
  lineColor?: string;
  identityReset?: boolean;
  onPointChange: (index: number, point: { x: number; y: number }) => void;
  onPointCountChange: (count: number) => void;
  onInterpolationChange: (next: string) => void;
  onOffsetAll?: (deltaY: number) => void;
  onReset?: () => void;
}) {
  let curveRef: HTMLDivElement | undefined;
  let lastRollingTap = 0;
  const rollingValue = () => averageCurveY(props.curve.points);

  const EPSILON = 0.005;

  const movePoint = (
    index: number,
    clientX: number,
    clientY: number,
    offsetX = 0,
    offsetY = 0,
    lockX = false,
    lockY = false,
  ) => {
    if (!curveRef) return;
    const rect = curveRef.getBoundingClientRect();
    const current = props.curve.points[index];
    const nx = lockX
      ? current.x
      : Math.max(0, Math.min(1, (clientX - rect.left - offsetX) / rect.width));
    const ny = lockY
      ? current.y
      : Math.max(
          0,
          Math.min(1, 1 - (clientY - rect.top - offsetY) / rect.height),
        );

    const isFirst = index === 0;
    const isLast = index === props.curve.points.length - 1;

    if (isFirst) {
      props.onPointChange(index, { x: 0, y: ny });
      return;
    }
    if (isLast) {
      props.onPointChange(index, { x: 1, y: ny });
      return;
    }

    // Sort all points by x to find true neighbors in sorted order,
    // regardless of their original array index
    const sorted = props.curve.points
      .map((p, i) => ({ ...p, origIndex: i }))
      .sort((a, b) => a.x - b.x);
    const sortedPos = sorted.findIndex((p) => p.origIndex === index);

    const prevX = sortedPos > 0 ? sorted[sortedPos - 1].x : 0;
    const nextX = sortedPos < sorted.length - 1 ? sorted[sortedPos + 1].x : 1;

    const clampedX = Math.max(prevX + EPSILON, Math.min(nextX - EPSILON, nx));

    props.onPointChange(index, { x: clampedX, y: ny });
  };

  const path = () => curvePath(props.curve.points, props.curve.interpolation);

  return (
    <div class="curve-editor">
      <div class="curve-side-left" title="Drag to move all points">
        <div
          class="rolling-surface"
          onPointerDown={(e) => {
            e.preventDefault();
            const now = Date.now();
            if (now - lastRollingTap > 0 && now - lastRollingTap < 500) {
              props.onOffsetAll?.(0.5 - rollingValue());
              lastRollingTap = 0;
              return;
            }
            lastRollingTap = now;

            const host = e.currentTarget;
            const rect = host.getBoundingClientRect();
            const startY = e.clientY;
            const startPos = 1 - rollingValue();
            let prevValue = rollingValue();
            let didMove = false;

            const onMove = (ev: PointerEvent) => {
              didMove = true;
              const dy = ev.clientY - startY;
              const nextPos = Math.max(
                0,
                Math.min(1, startPos + dy / Math.max(1, rect.height)),
              );
              const nextValue = 1 - nextPos;
              const delta = nextValue - prevValue;
              prevValue = nextValue;
              props.onOffsetAll?.(delta);
            };
            const onUp = () => {
              window.removeEventListener("pointermove", onMove);
              window.removeEventListener("pointerup", onUp);
              if (didMove) lastRollingTap = 0;
            };

            window.addEventListener("pointermove", onMove);
            window.addEventListener("pointerup", onUp, { once: true });
          }}
        >
          <div
            class="rolling-indicator"
            style={{ top: `${(1 - rollingValue()) * 100}%` }}
          />
        </div>
      </div>
      <div ref={curveRef} class={`curve-box ${props.hueMode ? "hue" : ""}`}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <path
            d={path()}
            stroke={props.lineColor ?? "rgba(226,226,233,.85)"}
          />
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
              onPointerDown={(e) => {
                e.preventDefault();
                const rect = curveRef?.getBoundingClientRect();
                const current = props.curve.points[index()];
                const offsetX = rect
                  ? e.clientX - (rect.left + current.x * rect.width)
                  : 0;
                const offsetY = rect
                  ? e.clientY - (rect.top + (1 - current.y) * rect.height)
                  : 0;
                const lockedX =
                  index() === 0 || index() === props.curve.points.length - 1;

                const onMove = (ev: PointerEvent) =>
                  movePoint(
                    index(),
                    ev.clientX,
                    ev.clientY,
                    offsetX,
                    offsetY,
                    lockedX || ev.altKey,
                    ev.shiftKey,
                  );
                const onUp = () => {
                  window.removeEventListener("pointermove", onMove);
                  window.removeEventListener("pointerup", onUp);
                };

                window.addEventListener("pointermove", onMove);
                window.addEventListener("pointerup", onUp, { once: true });
              }}
              onDblClick={(e) => {
                e.preventDefault();
                const current = props.curve.points[index()];
                props.onPointChange(index(), {
                  x: current.x,
                  y: props.identityReset ? current.x : 0.5,
                });
              }}
            />
          )}
        </For>
      </div>
      <div class="curve-side-right">
        <div
          class="curve-metric"
          title="Drag to change number of curve points"
          onPointerDown={(e) => {
            e.preventDefault();
            const startY = e.clientY;
            const startCount = props.curve.pointCount;
            let lastCount = startCount;

            const onMove = (ev: PointerEvent) => {
              const delta = Math.round((startY - ev.clientY) / 18);
              const next = Math.max(2, Math.min(7, startCount + delta));
              if (next !== lastCount) {
                lastCount = next;
                props.onPointCountChange(next);
              }
            };
            const onUp = () => {
              window.removeEventListener("pointermove", onMove);
              window.removeEventListener("pointerup", onUp);
            };

            window.addEventListener("pointermove", onMove);
            window.addEventListener("pointerup", onUp, { once: true });
          }}
        >
          <strong>{props.curve.pointCount}</strong>
          <span>Points</span>
        </div>
        <button
          type="button"
          class="curve-control-button"
          onClick={() => {
            const current = props.curve.interpolation.toLowerCase();
            const next =
              current === "cubic"
                ? "Bezier"
                : current === "bezier"
                  ? "Linear"
                  : "Cubic";
            props.onInterpolationChange(next);
          }}
          title="Click to change curve interpolation"
        >
          <img src={interpolationIcon(props.curve.interpolation)} alt="" />
          <span>{capitalizedInterpolation(props.curve.interpolation)}</span>
        </button>
        <button
          type="button"
          class="curve-control-button"
          onClick={() => props.onReset?.() ?? props.onPointCountChange(4)}
          title="Reset curve points"
        >
          <img src="/assets/icons/reset_icon.svg" alt="" />
          <span>Reset</span>
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
    setEdit(
      (s) => {
        const section = s[panel] as any;
        if (section && "bypass" in section) section.bypass = !section.bypass;
      },
      `${String(panel)} bypass`,
    );
  };

  const handleCurvePointChange = (
    panel:
      | "exposure"
      | "contrast"
      | "density"
      | "chroma"
      | "radiance"
      | "saturation",
    index: number,
    point: { x: number; y: number },
  ) => {
    setEdit((s) => {
      const points = s[panel].curve.points;
      points[index] = point;
      if (
        (panel === "density" || panel === "radiance") &&
        (index === 0 || index === points.length - 1)
      ) {
        const pairedIndex = index === 0 ? points.length - 1 : 0;
        points[pairedIndex] = { ...points[pairedIndex], y: point.y };
      }
    }, `${panel} curve`);
  };

  const handleCurvePointCount = (
    panel:
      | "exposure"
      | "contrast"
      | "density"
      | "chroma"
      | "radiance"
      | "saturation",
    count: number,
  ) => {
    const nextCount = Math.max(
      2,
      Math.min(7, Math.round(Number.isFinite(count) ? count : 2)),
    );
    setEdit((s) => {
      const pts = [...s[panel].curve.points].sort((a, b) => a.x - b.x);
      const first = pts[0] ?? { x: 0, y: 0.5 };
      const last = pts[pts.length - 1] ?? { x: 1, y: 0.5 };
      const span = last.x - first.x;
      const nextPoints = Array.from({ length: nextCount }, (_, index) => {
        if (index === 0) return { ...first };
        if (index === nextCount - 1) return { ...last };
        const x = clampUnit(first.x + (span * index) / (nextCount - 1));
        return {
          x,
          y: evaluateCurveY(pts, s[panel].curve.interpolation, x),
        };
      });

      s[panel].curve.points = nextPoints;
      s[panel].curve.pointCount = nextPoints.length;
    }, `${panel} point count`);
  };

  const handleCurveOffset = (
    panel:
      | "exposure"
      | "contrast"
      | "density"
      | "chroma"
      | "radiance"
      | "saturation",
    deltaY: number,
  ) => {
    if (!Number.isFinite(deltaY) || deltaY === 0) return;
    setEdit((s) => {
      s[panel].curve.points = s[panel].curve.points.map((p) => ({
        x: p.x,
        y: Math.max(0, Math.min(1, p.y + deltaY)),
      }));
    }, `${panel} offset`);
  };

  const handleCurveInterpolation = (
    panel:
      | "exposure"
      | "contrast"
      | "density"
      | "chroma"
      | "radiance"
      | "saturation",
    next: string,
  ) => {
    setEdit((s) => {
      s[panel].curve.interpolation = next;
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
          width: clamp(360px, 32vw, 520px);
          flex-shrink: 0;
          background: linear-gradient(180deg, #1b1c25 0%, #171821 100%);
          border-left: 1px solid rgba(255,255,255,0.06);
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
          padding: 10px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.08) transparent;
        }
        .panels-container::-webkit-scrollbar { width: 4px; }
        .panels-container::-webkit-scrollbar-track { background: transparent; }
        .panels-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .panel-section {
          margin-bottom: 6px;
          border-radius: 12px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.04);
          overflow: hidden;
        }
        .panel-section.bypassed .panel-content {
          opacity: 0.35;
          pointer-events: none;
        }
        .panel-header {
          width: 100%;
          height: 42px;
          padding: 0 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.025);
          border: none;
          border-radius: 0;
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
          padding: 14px;
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
          grid-template-columns: 70px 1fr 42px;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
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
          height: 6px;
          background: rgba(255,255,255,0.08);
          border-radius: 999px;
          overflow: hidden;
          pointer-events: none;
        }
        .slider-fill {
          height: 100%;
          background: linear-gradient(90deg, #7e8fb0 0%, #4d8af0 100%);
          border-radius: 999px;
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
          gap: 12px;
        }
        .point-control {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
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
          color: rgba(226, 226, 233, 0.85);
          font-weight: 700;
        }
        .point-pad {
          position: relative;
          aspect-ratio: 1;
          border-radius: 9px;
          background: radial-gradient(120% 120% at 80% 10%, rgba(106, 34, 67, 0.35), transparent 45%), linear-gradient(180deg, #2c3140 0%, #15172a 100%);
          border: 1px solid rgba(255,255,255,0.15);
          overflow: hidden;
          cursor: crosshair;
          touch-action: none;
        }
        .point-pad.balance-left {
          background: radial-gradient(90% 100% at 85% 20%, rgba(120, 20, 95, 0.38), transparent 42%), linear-gradient(145deg, #3f4552 0%, #14142b 72%);
          border-color: rgba(227, 240, 255, 0.85);
        }
        .point-pad.balance-right {
          background: radial-gradient(90% 100% at 85% 20%, rgba(201, 87, 37, 0.35), transparent 42%), radial-gradient(90% 100% at 30% 85%, rgba(25, 111, 39, 0.3), transparent 45%), linear-gradient(145deg, #33104e 0%, #0f2d1a 78%);
          border-color: rgba(177, 255, 91, 0.7);
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
          display: grid;
          grid-template-columns: 36px minmax(0, 1fr) 64px;
          gap: 12px;
          align-items: stretch;
          min-height: 240px;
        }
        .curve-box {
          position: relative;
          min-height: 240px;
          border-radius: 8px;
          background: radial-gradient(circle at 10% 10%, rgba(255,255,255,0.08) 1px, transparent 1.4px) 0 0 / 32px 32px, #1a1b26;
          border: 1px solid rgba(255,255,255,0.11);
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
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background: rgb(226, 226, 233);
          border: 15px solid transparent;
          background-clip: padding-box;
          transform: translate(-50%, -50%);
          box-shadow: 0 2px 8px rgba(0,0,0,.35);
          cursor: grab;
          touch-action: none;
          user-select: none;
        }
        .curve-point:active { cursor: grabbing; }
        .curve-side-left {
          position: relative;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          background:
            repeating-linear-gradient(
              to bottom,
              transparent 0 23px,
              rgba(255,255,255,0.08) 23px 24px
            );
        }
        .rolling-surface {
          position: absolute;
          inset: 0;
          cursor: ns-resize;
          touch-action: none;
        }
        .rolling-indicator {
          position: absolute;
          left: 4px;
          right: 4px;
          height: 4px;
          border-radius: 99px;
          background: rgba(255,255,255,0.9);
          transform: translateY(-50%);
          box-shadow: 0 0 8px rgba(255,255,255,0.35);
          pointer-events: none;
        }
        .curve-side-right {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-evenly;
          gap: 8px;
          color: rgba(226,226,233,.5);
          font-size: 10px;
        }
        .curve-metric {
          text-align: center;
          cursor: ns-resize;
          user-select: none;
          touch-action: none;
        }
        .curve-metric strong {
          display: block;
          font-size: 42px;
          line-height: 0.9;
          color: rgba(226,226,233,.65);
          font-weight: 700;
        }
        .curve-metric span {
          display: block;
          margin-top: 2px;
          letter-spacing: .02em;
        }
        .curve-side-right button,
        .small-action {
          height: 28px;
          min-width: 54px;
          padding: 0 8px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.05);
          color: rgba(226,226,233,.75);
          font-size: 10px;
          cursor: pointer;
        }
        .curve-side-right button { width: 100%; }
        .curve-control-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          height: 48px;
          padding: 4px 6px;
        }
        .curve-control-button img {
          width: 18px;
          height: 18px;
          opacity: .72;
        }
        .curve-control-button span {
          line-height: 1;
        }
        .balance-readout {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .balance-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          padding: 5px 10px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          font-size: 11px;
          color: rgba(226,226,233,.75);
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
          <div class="balance-readout">
            <span class="balance-pill">
              Exp {Math.round((editState().balance.exposure + 1) * 100)}% &nbsp;
              Sat {Math.round((editState().balance.saturation + 1) * 100)}%
            </span>
            <span class="balance-pill">
              Tnt {editState().balance.tint.toFixed(2)} &nbsp; Tmp{" "}
              {editState().balance.temperature.toFixed(2)}
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
                }, "Balance");
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
                }, "Balance");
              }}
            />
          </div>
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
            onPointCountChange={(count) =>
              handleCurvePointCount("exposure", count)
            }
            onInterpolationChange={(next) =>
              handleCurveInterpolation("exposure", next)
            }
            onOffsetAll={(delta) => handleCurveOffset("exposure", delta)}
            onReset={() => resetPanel("exposure")}
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
            identityReset
            onPointChange={(i, p) => handleCurvePointChange("contrast", i, p)}
            onPointCountChange={(count) =>
              handleCurvePointCount("contrast", count)
            }
            onInterpolationChange={(next) =>
              handleCurveInterpolation("contrast", next)
            }
            onOffsetAll={(delta) => handleCurveOffset("contrast", delta)}
            onReset={() => resetPanel("contrast")}
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
            onPointCountChange={(count) =>
              handleCurvePointCount("density", count)
            }
            onInterpolationChange={(next) =>
              handleCurveInterpolation("density", next)
            }
            onOffsetAll={(delta) => handleCurveOffset("density", delta)}
            onReset={() => resetPanel("density")}
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
            onPointCountChange={(count) =>
              handleCurvePointCount("chroma", count)
            }
            onInterpolationChange={(next) =>
              handleCurveInterpolation("chroma", next)
            }
            onOffsetAll={(delta) => handleCurveOffset("chroma", delta)}
            onReset={() => resetPanel("chroma")}
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
            onPointCountChange={(count) =>
              handleCurvePointCount("radiance", count)
            }
            onInterpolationChange={(next) =>
              handleCurveInterpolation("radiance", next)
            }
            onOffsetAll={(delta) => handleCurveOffset("radiance", delta)}
            onReset={() => resetPanel("radiance")}
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
            onPointCountChange={(count) =>
              handleCurvePointCount("saturation", count)
            }
            onInterpolationChange={(next) =>
              handleCurveInterpolation("saturation", next)
            }
            onOffsetAll={(delta) => handleCurveOffset("saturation", delta)}
            onReset={() => resetPanel("saturation")}
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
            onClick={() =>
              showToast(
                "Set zoom to 100% for accurate diffusion preview",
                "info",
              )
            }
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
