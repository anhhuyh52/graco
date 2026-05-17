/**
 * CurveCanvas.tsx
 *
 * Renders the SVG curve path inside the curve box.
 * Pure rendering — takes a pre-built path string.
 * No interaction, no state.
 */

interface CurveCanvasProps {
  path: string;
  lineColor?: string;
}

export function CurveCanvas(props: CurveCanvasProps) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none">
      <path
        d={props.path}
        stroke={props.lineColor ?? "rgba(226,226,233,.85)"}
      />
    </svg>
  );
}
