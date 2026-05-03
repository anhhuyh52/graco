import { createSignal, Show, For } from "solid-js";
import { useColorIO } from "../../context/ColorIOContext";

export function MatchPanel() {
  const { setEdit, editState, showToast } = useColorIO();
  const [matchState, setMatchState] = createSignal<
    "idle" | "progress" | "active"
  >("idle");
  const [isLinked, setIsLinked] = createSignal(true);
  const [selectedRef, setSelectedRef] = createSignal<string | null>(null);

  const REFS = Array.from({ length: 32 }, (_, i) => ({
    name: `match_ref_${i + 1}.webp`,
    url: `/assets/img/match_refs/match_ref_${i + 1}.webp`,
  }));

  const handleSelectRef = (refName: string) => {
    setSelectedRef(refName);
    setMatchState("progress");

    // Simulate processing
    setTimeout(() => {
      setMatchState("active");
      showToast("Color match applied", "success");
    }, 1750);
  };

  const handleBypass = () => {
    setSelectedRef("bypass");
    setMatchState("idle");
    setEdit((s) => {
      s.match.bypass = true;
    }, "Match Bypass");
  };

  const handleSliderChange = (type: "color" | "tone", value: number) => {
    setEdit((s) => {
      if (type === "color") {
        s.match.color = value;
        if (isLinked()) s.match.tone = value;
      } else {
        s.match.tone = value;
        if (isLinked()) s.match.color = value;
      }
    }, "Match Adjustment");
  };

  const toggleLink = () => {
    setIsLinked(!isLinked());
    if (isLinked()) {
      handleSliderChange("color", editState().match.color);
    }
  };

  return (
    <div class="match-panel" data-state={matchState()}>
      <style>{`
        .match-panel { display: flex; flex-direction: column; gap: 12px; height: 100%; }
        .refs-container { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; max-height: 300px; overflow-y: auto; padding-right: 4px; }
        .ref-item { aspect-ratio: 1; border-radius: 12px; background: var(--theme-higher-050); cursor: pointer; border: 2px solid transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .ref-item.selected { border-color: var(--theme-primary); }
        .ref-item img { width: 100%; height: 100%; object-fit: cover; }
        .ref-item.icon { padding: 8px; opacity: 0.5; }
        .match-controls { position: relative; min-height: 96px; background: var(--theme-higher-050); border-radius: 12px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .info-box { display: flex; align-items: center; gap: 12px; padding: 0 16px; font-size: 11px; opacity: 0.6; }
        .progress-bar { position: absolute; left: 0; bottom: 0; height: 2px; background: var(--theme-primary); width: 100%; transform-origin: left; }
        .match-panel[data-state="progress"] .progress-bar { animation: mp 1.75s linear; }
        @keyframes mp { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        .sliders-overlay { width: 100%; display: flex; align-items: center; gap: 10px; padding: 0 12px; }
        .match-slider { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .slider-label { font-size: 10px; font-weight: 600; opacity: 0.5; text-transform: uppercase; }
        .slider-input { flex: 1; }
        .link-btn { width: 28px; height: 28px; border-radius: 50%; border: none; background: var(--theme-higher-100); color: var(--theme-text-000); }
        .link-btn.linked { color: var(--theme-primary); }
      `}</style>
      <div class="refs-container">
        <button
          class={`ref-item icon ${selectedRef() === "import" ? "selected" : ""}`}
          onClick={() => showToast("Import not implemented", "info")}
          title="Import reference image"
        >
          <img src="/assets/icons/open_folder_icon.svg" />
        </button>
        <button
          class={`ref-item icon ${selectedRef() === "bypass" ? "selected" : ""}`}
          onClick={handleBypass}
          title="Bypass"
        >
          <img src="/assets/icons/bypass_icon.svg" />
        </button>
        <For each={REFS}>
          {(ref) => (
            <button
              class={`ref-item ${selectedRef() === ref.name ? "selected" : ""}`}
              onClick={() => handleSelectRef(ref.name)}
            >
              <img src={ref.url} loading="lazy" />
            </button>
          )}
        </For>
      </div>

      <div class="match-controls">
        <Show when={matchState() === "idle"}>
          <div class="info-box">
            <img src="/assets/icons/sprinkle_icon.svg" />
            <span>
              Choose a reference image to match colors from and fine-tune your
              grade.
            </span>
          </div>
        </Show>

        <Show when={matchState() === "progress"}>
          <div class="info-box">
            <span>Analyzing reference image...</span>
          </div>
        </Show>
        <div class="progress-bar" />
        <Show when={matchState() === "active"}>
          <div class="sliders-overlay">
            <div class="match-slider">
              <span class="slider-label">Color</span>
              <div class="slider-row">
                <input
                  type="range"
                  class="slider-input"
                  min="0"
                  max="2"
                  step="0.01"
                  value={editState().match.color}
                  onInput={(e) =>
                    handleSliderChange(
                      "color",
                      parseFloat(e.currentTarget.value),
                    )
                  }
                />
              </div>
            </div>

            <button
              class={`link-btn ${isLinked() ? "linked" : ""}`}
              onClick={toggleLink}
              title="Link color and tone"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </button>

            <div class="match-slider">
              <span class="slider-label">Tone</span>
              <div class="slider-row">
                <input
                  type="range"
                  class="slider-input"
                  min="0"
                  max="2"
                  step="0.01"
                  value={editState().match.tone}
                  onInput={(e) =>
                    handleSliderChange(
                      "tone",
                      parseFloat(e.currentTarget.value),
                    )
                  }
                />
              </div>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}
