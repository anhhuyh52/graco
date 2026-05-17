import { createSignal, Show, For } from "solid-js";
import { useColorIO } from "../../context/ColorIOContext";
import { ValueSlider } from "./panels/ValueSlider";

export function MatchPanel() {
  const { setEdit, editState, showToast } = useColorIO();
  const [matchState, setMatchState] = createSignal<
    "idle" | "progress" | "active"
  >("idle");
  const [isLinked, setIsLinked] = createSignal(true);
  const [selectedRef, setSelectedRef] = createSignal<string | null>(null);
  const [processingMessage, setProcessingMessage] = createSignal("Analyzing reference image...");
  const [hoverRef, setHoverRef] = createSignal<string | null>(null);

  const REFS = Array.from({ length: 32 }, (_, i) => ({
    name: `match_ref_${i + 1}.webp`,
    url: `/assets/img/match_refs/match_ref_${i + 1}.webp`,
  }));

  const handleSelectRef = (refName: string) => {
    setSelectedRef(refName);
    setMatchState("progress");

    // Simulate intelligent processing steps
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step === 1) setProcessingMessage("Extracting tonal response...");
      if (step === 2) setProcessingMessage("Matching spectral envelope...");
      if (step === 3) setProcessingMessage("Aligning color space...");
    }, 450);

    setTimeout(() => {
      clearInterval(interval);
      setMatchState("active");
      showToast("Color match applied", "success");
    }, 1800);
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
        .match-panel { display: flex; flex-direction: column; gap: 16px; height: 100%; position: relative; }
        .refs-container { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; max-height: 320px; overflow-y: auto; padding-right: 4px; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.06) transparent; }
        .refs-container::-webkit-scrollbar { width: 3px; }
        .refs-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .ref-item { aspect-ratio: 16/9; border-radius: 8px; background: rgba(255,255,255,0.02); cursor: pointer; border: 1px solid rgba(255,255,255,0.05); overflow: hidden; display: flex; align-items: center; justify-content: center; transition: all 150ms; position: relative; }
        .ref-item::before { content: ''; position: absolute; inset: 0; background: linear-gradient(0deg, rgba(77,138,240,0.2), transparent); opacity: 0; transition: opacity 150ms; }
        .ref-item:hover { border-color: rgba(255,255,255,0.2); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        .ref-item:hover::before { opacity: 1; }
        .ref-item.selected { border-color: rgb(77,138,240); box-shadow: 0 0 0 1px rgb(77,138,240); }
        .ref-item img { width: 100%; height: 100%; object-fit: cover; filter: brightness(0.9); transition: filter 150ms; }
        .ref-item:hover img { filter: brightness(1.1); }
        .ref-item.icon { padding: 12px; opacity: 0.5; background: rgba(255,255,255,0.04); border-style: dashed; }
        .ref-item.icon:hover { opacity: 0.8; }
        .match-controls { position: relative; min-height: 100px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .info-box { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px; font-size: 11px; opacity: 0.7; text-align: center; }
        .info-box img { width: 20px; opacity: 0.6; filter: invert(1); }
        .progress-bar { position: absolute; left: 0; bottom: 0; height: 2px; background: rgb(77,138,240); width: 100%; transform-origin: left; box-shadow: 0 0 8px rgba(77,138,240,0.6); }
        .match-panel[data-state="progress"] .progress-bar { animation: mp 1.8s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes mp { 0% { transform: scaleX(0); } 50% { transform: scaleX(0.7); } 100% { transform: scaleX(1); } }
        .sliders-overlay { width: 100%; display: flex; flex-direction: column; gap: 12px; padding: 16px; }
        .slider-row { display: flex; align-items: center; gap: 12px; }
        .slider-wrapper { flex: 1; }
        .link-btn { width: 32px; height: 32px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: rgba(226,226,233,0.5); cursor: pointer; transition: all 120ms; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .link-btn:hover { background: rgba(255,255,255,0.06); color: rgba(226,226,233,0.9); }
        .link-btn.linked { color: rgb(77,138,240); border-color: rgba(77,138,240,0.3); background: rgba(77,138,240,0.1); }
        /* Floating Preview */
        .floating-preview { position: absolute; top: 0; left: 0; right: 0; height: 180px; z-index: 10; pointer-events: none; opacity: 0; transform: translateY(10px); transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1); border-radius: 8px; overflow: hidden; box-shadow: 0 12px 32px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1); }
        .floating-preview.visible { opacity: 1; transform: translateY(-4px); }
        .floating-preview img { width: 100%; height: 100%; object-fit: cover; }
        .preview-label { position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; color: #fff; letter-spacing: 0.05em; }
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
              onMouseEnter={() => setHoverRef(ref.url)}
              onMouseLeave={() => setHoverRef(null)}
            >
              <img src={ref.url} loading="lazy" alt="Reference match target" />
            </button>
          )}
        </For>
      </div>

      <div class="match-controls">
        <Show when={matchState() === "idle"}>
          <div class="info-box">
            <img src="/assets/icons/sprinkle_icon.svg" alt="" />
            <span>
              Choose a reference image to match colors from and fine-tune your
              grade.
            </span>
          </div>
        </Show>

        <Show when={matchState() === "progress"}>
          <div class="info-box">
            <img src="/assets/icons/info_icon.svg" alt="" />
            <span>{processingMessage()}</span>
          </div>
        </Show>
        <div class="progress-bar" />
        
        <Show when={matchState() === "active"}>
          <div class="sliders-overlay">
            <div class="slider-row">
              <div class="slider-wrapper">
                <ValueSlider
                  label="Color Intensity"
                  value={editState().match.color}
                  min={0}
                  max={2}
                  step={0.01}
                  onChange={(v) => handleSliderChange("color", v)}
                />
              </div>
              <button
                class={`link-btn ${isLinked() ? "linked" : ""}`}
                onClick={toggleLink}
                title="Link Color and Tone"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </button>
            </div>
            
            <div class="slider-row">
              <div class="slider-wrapper">
                <ValueSlider
                  label="Tone Intensity"
                  value={editState().match.tone}
                  min={0}
                  max={2}
                  step={0.01}
                  onChange={(v) => handleSliderChange("tone", v)}
                />
              </div>
              <div style="width: 32px;" /> {/* Spacer to align with link button */}
            </div>
          </div>
        </Show>
      </div>

      {/* Floating Cinematic Preview */}
      <div class={`floating-preview ${hoverRef() ? 'visible' : ''}`}>
        <Show when={hoverRef()}>
          <img src={hoverRef()!} alt="Preview" />
          <div class="preview-label">Reference Preview</div>
        </Show>
      </div>
    </div>
  );
}
