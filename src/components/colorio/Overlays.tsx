import { createSignal, Show, For } from "solid-js";
import { useColorIO } from "../../context/ColorIOContext";

export function ProjectsOverlay() {
  const {
    projects,
    activeProjectId,
    setActiveProject,
    createProject,
    deleteProject,
    importImages,
    setOverlay,
  } = useColorIO();

  const [showNewForm, setShowNewForm] = createSignal(false);
  const [newProjectName, setNewProjectName] = createSignal("");

  const handleCreate = () => {
    const name = newProjectName().trim();
    if (name) {
      createProject(name);
      setShowNewForm(false);
      setNewProjectName("");
    }
  };

  const handleOpenImages = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = () => {
      if (input.files?.length) {
        importImages(Array.from(input.files));
        setOverlay(null);
      }
    };
    input.click();
  };

  return (
    <div class="overlay-backdrop" onClick={(e) => e.target === e.currentTarget && setOverlay(null)}>
      <style>{`
        .overlay-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .overlay-window {
          background: rgb(35, 35, 42);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          overflow: hidden;
          min-width: 360px;
          max-width: 90vw;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
        }
        .overlay-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .overlay-title {
          font-size: 16px;
          font-weight: 700;
        }
        .close-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background: none;
          border: none;
          color: rgba(226, 226, 233, 0.6);
          transition: all 120ms;
        }
        .close-btn:hover {
          background: rgba(255,255,255,0.08);
          color: rgb(226, 226, 233);
        }
        .overlay-actions {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .action-btn {
          height: 32px;
          padding: 0 16px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 120ms;
        }
        .action-btn.primary {
          background: #4d8af0;
          color: white;
        }
        .action-btn.primary:hover { background: #5a9aff; }
        .action-btn.secondary {
          background: rgba(255,255,255,0.08);
          color: rgb(226, 226, 233);
        }
        .action-btn.secondary:hover { background: rgba(255,255,255,0.12); }
        .new-project-form {
          display: flex;
          gap: 8px;
          padding: 0 16px 12px;
          align-items: center;
        }
        .new-project-input {
          flex: 1;
          height: 30px;
          padding: 0 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px;
          font-size: 11px;
          color: rgb(226, 226, 233);
        }
        .new-project-input:focus {
          outline: none;
          border-color: #4d8af0;
        }
        .projects-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }
        .project-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 120ms;
          margin-bottom: 4px;
        }
        .project-item:hover {
          background: rgba(255,255,255,0.05);
        }
        .project-item.active {
          background: rgba(77, 138, 240, 0.15);
          border: 1px solid rgba(77, 138, 240, 0.3);
        }
        .project-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .project-icon img {
          width: 18px;
          height: 18px;
          filter: brightness(0) invert(1);
          opacity: 0.5;
        }
        .project-info {
          flex: 1;
          min-width: 0;
        }
        .project-name {
          font-size: 13px;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .project-meta {
          font-size: 11px;
          opacity: 0.4;
        }
        .project-delete {
          width: 26px;
          height: 26px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background: none;
          border: none;
          color: rgba(226, 226, 233, 0.4);
          opacity: 0;
          transition: all 120ms;
        }
        .project-item:hover .project-delete {
          opacity: 1;
        }
        .project-delete:hover {
          color: #ff5c5c;
          background: rgba(255,92,92,0.1);
        }
        .empty-state {
          padding: 48px;
          text-align: center;
          opacity: 0.3;
          font-size: 12px;
        }
      `}</style>

      <div class="overlay-window">
        <div class="overlay-header">
          <h2 class="overlay-title">Projects</h2>
          <button class="close-btn" onClick={() => setOverlay(null)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <div class="overlay-actions">
          <button class="action-btn primary" onClick={handleOpenImages}>
            Open Image(s)
          </button>
          <button class="action-btn secondary" onClick={() => setShowNewForm(!showNewForm())}>
            + New Project
          </button>
        </div>

        <Show when={showNewForm()}>
          <div class="new-project-form">
            <input
              class="new-project-input"
              placeholder="Project name..."
              value={newProjectName()}
              onInput={(e) => setNewProjectName(e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <button class="action-btn primary" onClick={handleCreate}>
              Create
            </button>
          </div>
        </Show>

        <div class="projects-list">
          <Show
            when={projects().length > 0}
            fallback={<div class="empty-state">No projects yet</div>}
          >
            <For each={projects()}>
              {(project) => (
                <div
                  class={`project-item ${project.id === activeProjectId() ? "active" : ""}`}
                  onClick={() => {
                    setActiveProject(project.id);
                    setOverlay(null);
                  }}
                >
                  <div class="project-icon">
                    <img src="/assets/icons/folder_icon.svg" alt="" />
                  </div>
                  <div class="project-info">
                    <div class="project-name">{project.name}</div>
                    <div class="project-meta">
                      {project.userMedia.reduce((t, m) => t + m.images.length, 0)} image(s)
                    </div>
                  </div>
                  <button
                    class="project-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProject(project.id);
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 3h8M5 3V2h2v1M4 3v6h4V3H4z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </div>
              )}
            </For>
          </Show>
        </div>
      </div>
    </div>
  );
}

export function ExportOverlay() {
  const { setOverlay, showToast } = useColorIO();
  const [activeTab, setActiveTab] = createSignal<"image" | "lut">("image");
  const [format, setFormat] = createSignal("jpg");

  const handleExport = () => {
    showToast("Exporting...", "info");
    setOverlay(null);
    setTimeout(() => showToast("Export complete", "success"), 800);
  };

  return (
    <div class="overlay-backdrop" onClick={(e) => e.target === e.currentTarget && setOverlay(null)}>
      <style>{`
        .overlay-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .overlay-window {
          background: rgb(35, 35, 42);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          overflow: hidden;
          min-width: 320px;
          max-width: 90vw;
          display: flex;
          flex-direction: column;
        }
        .overlay-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .tabs {
          display: flex;
          gap: 2px;
          background: rgba(255,255,255,0.05);
          border-radius: 4px;
          padding: 2px;
        }
        .tab {
          padding: 4px 12px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          background: none;
          color: rgba(226, 226, 233, 0.5);
          transition: all 120ms;
        }
        .tab.active {
          background: rgba(255,255,255,0.1);
          color: rgb(226, 226, 233);
        }
        .close-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background: none;
          border: none;
          color: rgba(226, 226, 233, 0.6);
        }
        .close-btn:hover {
          background: rgba(255,255,255,0.08);
          color: rgb(226, 226, 233);
        }
        .overlay-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .format-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .section-label {
          font-size: 11px;
          opacity: 0.5;
          font-weight: 600;
        }
        .format-options {
          display: flex;
          gap: 2px;
          background: rgba(255,255,255,0.05);
          border-radius: 4px;
          padding: 2px;
        }
        .format-btn {
          flex: 1;
          padding: 6px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          background: none;
          color: rgba(226, 226, 233, 0.6);
          transition: all 120ms;
        }
        .format-btn.active {
          background: rgba(255,255,255,0.1);
          color: rgb(226, 226, 233);
        }
        .export-btn {
          height: 36px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          background: #4d8af0;
          color: white;
          border: none;
          cursor: pointer;
          transition: background 120ms;
          margin-top: 8px;
        }
        .export-btn:hover { background: #5a9aff; }
      `}</style>

      <div class="overlay-window">
        <div class="overlay-header">
          <div class="tabs">
            <button
              class={`tab ${activeTab() === "image" ? "active" : ""}`}
              onClick={() => setActiveTab("image")}
            >
              Export Image
            </button>
            <button
              class={`tab ${activeTab() === "lut" ? "active" : ""}`}
              onClick={() => setActiveTab("lut")}
            >
              Export LUT
            </button>
          </div>
          <button class="close-btn" onClick={() => setOverlay(null)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <div class="overlay-body">
          <Show when={activeTab() === "image"}>
            <div class="format-section">
              <span class="section-label">Format</span>
              <div class="format-options">
                {["jpg", "png", "tif"].map((f) => (
                  <button
                    class={`format-btn ${format() === f ? "active" : ""}`}
                    onClick={() => setFormat(f)}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </Show>

          <Show when={activeTab() === "lut"}>
            <div style={{ "font-size": "11px", opacity: 0.5, "text-align": "center", padding: "20px 0" }}>
              Export your current grade as a 33-point LUT file
            </div>
          </Show>

          <button class="export-btn" onClick={handleExport}>
            Export {activeTab() === "image" ? "Image" : "LUT"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Overlays() {
  const { ui } = useColorIO();

  return (
    <>
      {ui().overlay === "projects" && <ProjectsOverlay />}
      {ui().overlay === "export" && <ExportOverlay />}
    </>
  );
}
