/**
 * PointPad.tsx
 *
 * 2D draggable pad for balance/scattering/refraction controls.
 * Hardware-inspired, includes double-click to reset.
 */

interface PointPadProps {
  label: string;
  x: number;
  y: number;
  xLabel?: string;
  yLabel?: string;
  variant?: "default" | "balance-left" | "balance-right";
  onChange: (point: { x: number; y: number }) => void;
  onCommit?: (point: { x: number; y: number }) => void;
}

export function PointPad(props: PointPadProps) {
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
    const onTouchMove = (ev: TouchEvent) => {
      if (!dragging) return;
      const t = ev.touches[0];
      if (!t) return;
      ev.preventDefault();
      updateFromClient(t.clientX, t.clientY);
    };
    const cleanup = () => {
      dragging = false;
      const rect = padRef?.getBoundingClientRect();
      if (rect) {
        // One final read to ensure we have the last position
        // but we'll use the last known good values if we can't read
      }
      // props.onCommit should receive the last values
      // We'll capture them in the drag loop and use them here
      
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", cleanup);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", cleanup);
      window.removeEventListener("touchcancel", cleanup);
      
      // Call onCommit at the very end
      if (props.onCommit) {
        props.onCommit({ x: props.x, y: props.y });
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", cleanup);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", cleanup);
    window.addEventListener("touchcancel", cleanup);
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
        onDblClick={(e) => {
          e.preventDefault();
          props.onChange({ x: 0, y: 0 });
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
