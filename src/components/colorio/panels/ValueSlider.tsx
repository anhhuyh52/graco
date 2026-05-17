/**
 * ValueSlider.tsx
 *
 * Professional labeled range slider with visual fill track.
 * Auto-detects centered ranges (e.g., -1 to 1) for bidirectional fill.
 */

interface ValueSliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}

export function ValueSlider(props: ValueSliderProps) {
  const min = () => props.min ?? -1;
  const max = () => props.max ?? 1;
  const clampToRange = (value: number) =>
    Math.max(min(), Math.min(max(), value));
    
  const percent = () =>
    Math.max(
      0,
      Math.min(100, ((props.value - min()) / (max() - min())) * 100),
    );

  const isCentered = () => min() < 0 && max() > 0;

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
          aria-label={props.label}
          onInput={(e) => {
            const raw = Number.parseFloat(e.currentTarget.value);
            if (!Number.isFinite(raw)) return;
            props.onChange(clampToRange(raw));
          }}
          class="slider-input"
        />
        <div class="slider-track">
          {isCentered() && <div class="slider-center-tick" />}
          <div
            class="slider-fill"
            style={
              isCentered()
                ? {
                    left: `${Math.min(percent(), 50)}%`,
                    width: `${Math.abs(percent() - 50)}%`,
                    position: "absolute",
                  }
                : { width: `${percent()}%` }
            }
          />
        </div>
      </div>
      <span class="slider-value">{props.value.toFixed(2)}</span>
    </div>
  );
}
