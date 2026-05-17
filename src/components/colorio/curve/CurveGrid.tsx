/**
 * CurveGrid.tsx
 *
 * Renders the reference grid inside the curve canvas.
 * Pure rendering — no state, no interaction.
 */

export function CurveGrid(props: { showDiagonal?: boolean }) {
  // 3 vertical + 3 horizontal lines at 25%, 50%, 75%
  const positions = [0.25, 0.5, 0.75];

  return (
    <>
      {positions.map((pos) => (
        <>
          <div
            class="curve-grid-line vertical"
            style={{ left: `${pos * 100}%` }}
          />
          <div
            class="curve-grid-line horizontal"
            style={{ top: `${pos * 100}%` }}
          />
        </>
      ))}
      {/* Diagonal identity line */}
      {props.showDiagonal && (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          class="curve-diagonal"
        >
          <line
            x1="0"
            y1="100"
            x2="100"
            y2="0"
            stroke="rgba(255,255,255,0.07)"
            stroke-width="1"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      )}
    </>
  );
}
