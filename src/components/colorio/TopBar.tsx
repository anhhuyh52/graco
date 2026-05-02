import { useColorIO } from "../../context/ColorIOContext";
import { createSignal, Show } from "solid-js";

export function TopBar() {
  const {
    activeProject,
    activeImage,
    canUndo,
    canRedo,
    ui,
    undo,
    redo,
    setUI,
    setOverlay,
  } = useColorIO();

  const [isBypassing, setIsBypassing] = createSignal(false);

  const handleSplitToggle = () => {
    const next = ui().viewMode === "split" ? "single" : "split";
    setUI("viewMode", next);
  };

  const handleBypassStart = () => {
    setIsBypassing(true);
    setUI("globalBypass", true);
  };

  const handleBypassEnd = () => {
    setIsBypassing(false);
    setUI("globalBypass", false);
  };

  return (
    <header class="top-bar top-bar-host">
      <style>{`
        .top-bar {
          height: 44px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 8px;
          background: var(--theme-surface-050);
          border-bottom: 1px solid var(--theme-higher-100);
          flex-shrink: 0;
        }
        @media (orientation: landscape) {
          .top-bar {
            height: 54px;
          }
        }
        .logo-btn,.toolbar-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: var(--theme-text-100);
          cursor: pointer;
        }
        .logo-btn img { width: 18px; height: 18px; }
        .project-info { display: flex; align-items: center; gap: 4px; }
        .project-name { font-size: 13px; font-weight: 600; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .image-name,.sep { font-size: 11px; opacity: 0.35; }
        .image-name { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .flex-grow { flex: 1; }
        .undo-redo { display: flex; gap: 0; }
        .toolbar-btn:disabled { opacity: 0.25; cursor: default; }
        .toolbar-btn.active { color: var(--theme-primary); }
        .export-btn {
          height: 28px;
          padding: 0 10px;
          border-radius: 6px;
          border: none;
          background: var(--theme-primary);
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }
      `}</style>
      <button
        class="logo-btn"
        onClick={() => setOverlay("projects")}
        title="Projects"
      >
        <img src="/assets/cio_logo.svg" alt="Color.io" />
      </button>

      <div class="project-info">
        <span class="project-name">{activeProject()?.name ?? ""}</span>
        <Show when={activeImage()}>
          <span class="sep">/</span>
          <span class="image-name">{activeImage()?.name}</span>
        </Show>
      </div>

      <div class="flex-grow" />

      <div class="undo-redo">
        <button
          class="toolbar-btn"
          onClick={undo}
          disabled={!canUndo()}
          title="Undo (⌘Z)"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path
              d="M2 7.5A5 5 0 107 2.5H4.5"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
            />
            <path
              d="M2 2.5v5h5"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button
          class="toolbar-btn"
          onClick={redo}
          disabled={!canRedo()}
          title="Redo (⌘Y)"
          style={{ transform: "scaleX(-1)" }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path
              d="M2 7.5A5 5 0 107 2.5H4.5"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
            />
            <path
              d="M2 2.5v5h5"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>

      <div class="flex-grow" />

      <button
        class={`toolbar-btn ${ui().viewMode === "split" ? "active" : ""}`}
        onClick={handleSplitToggle}
        title="Split View"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect
            x="1"
            y="2"
            width="5"
            height="10"
            rx="1.5"
            stroke="currentColor"
            stroke-width="1.3"
          />
          <rect
            x="8"
            y="2"
            width="5"
            height="10"
            rx="1.5"
            stroke="currentColor"
            stroke-width="1.3"
          />
        </svg>
      </button>

      <button
        class={`toolbar-btn ${ui().showScopes ? "active" : ""}`}
        onClick={() => setUI("showScopes", !ui().showScopes)}
        title="Scopes"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M1 10L4 6l3 3 3-5 3 3"
            stroke="currentColor"
            stroke-width="1.3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <button
        class={`toolbar-btn ${isBypassing() ? "active" : ""}`}
        onPointerDown={handleBypassStart}
        onPointerUp={handleBypassEnd}
        onPointerLeave={handleBypassEnd}
        title="Hold to bypass all effects"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.3" />
          <line
            x1="4"
            y1="4"
            x2="10"
            y2="10"
            stroke="currentColor"
            stroke-width="1.3"
            stroke-linecap="round"
          />
        </svg>
      </button>

      <button class="export-btn" onClick={() => setOverlay("export")}>
        Export
      </button>
    </header>
  );
}
