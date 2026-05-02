import { onCleanup, onMount, createSignal, Show, createEffect } from "solid-js";
import { useColorIO } from "../../context/ColorIOContext";

export function Viewport() {
  const {
    activeImage,
    initRenderer,
    ui,
    setUI,
    importImages,
    activeMedia,
    setActiveImage,
  } = useColorIO();

  let containerRef: HTMLDivElement | undefined;
  let canvasRef: HTMLCanvasElement | undefined;
  const [zoomLevel, setZoomLevel] = createSignal<"fit" | number>("fit");
  const [isDragging, setIsDragging] = createSignal(false);

  const ZOOM_STEPS = [25, 50, 75, 100, 150, 200, 300, 400];
  onMount(() => {
    if (containerRef) {
      initRenderer(containerRef);
    }

    const resizeObserver = new ResizeObserver(() => applyZoom());
    if (containerRef) resizeObserver.observe(containerRef);
    onCleanup(() => resizeObserver.disconnect());
  });

  const getOneToOneScale = () => {
    const img = activeImage();
    if (!img || !containerRef) return 1;
    const viewW = containerRef.clientWidth || 1;
    const viewH = containerRef.clientHeight || 1;
    const texW = img.width || 1;
    const texH = img.height || 1;
    const texAspect = texW / texH;
    const viewAspect = viewW / viewH;
    return texAspect > viewAspect ? texW / viewW : texH / viewH;
  };

  const getFitPercent = () => Math.round((1 / getOneToOneScale()) * 100);

  const applyZoom = () => {
    const canvas = containerRef?.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) return;

    let scale = 1;
    const zl = zoomLevel();
    if (zl !== "fit") {
      scale = getOneToOneScale() * (zl / 100);
    }
    canvas.style.transform = scale === 1 ? "none" : `scale(${scale})`;
    canvas.style.transformOrigin = "center center";
    if (ui().zoom !== zl) setUI("zoom", zl);
  };

  const zoomIn = () => {
    if (!activeImage()) return;
    const zl = zoomLevel();
    if (zl === "fit") {
      setZoomLevel(100);
    } else {
      const idx = ZOOM_STEPS.indexOf(zl);
      if (idx === -1) {
        setZoomLevel(100);
      } else {
        setZoomLevel(ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, idx + 1)]);
      }
    }
  };

  const zoomOut = () => {
    if (!activeImage()) return;
    const zl = zoomLevel();
    if (zl === "fit") {
      const fitPercent = getFitPercent();
      const lowerStep = ZOOM_STEPS.filter((s) => s < fitPercent).pop();
      if (lowerStep != null) {
        setZoomLevel(lowerStep);
      }
    } else {
      const idx = ZOOM_STEPS.indexOf(zl);
      if (idx <= 0) return;
      setZoomLevel(ZOOM_STEPS[idx - 1]);
    }
  };

  const zoomFit = () => {
    setZoomLevel("fit");
  };

  const handleWheel = (e: WheelEvent) => {
    if (!activeImage()) return;
    e.preventDefault();
    e.deltaY < 0 ? zoomIn() : zoomOut();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || []).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length) importImages(files);
  };

  const handleDragOver = (e: DragEvent) => e.preventDefault();

  const handleSplitPointerDown = (
    e: PointerEvent & { currentTarget: HTMLDivElement },
  ) => {
    e.preventDefault();
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleSplitPointerMove = (e: PointerEvent) => {
    if (!isDragging() || !containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const x = Math.max(
      0.05,
      Math.min(0.95, (e.clientX - rect.left) / rect.width),
    );
    setUI("splitX", x);
  };

  const handleSplitPointerUp = (
    e: PointerEvent & { currentTarget: HTMLDivElement },
  ) => {
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleOpenImages = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.style.display = "none"; // hide it
    document.body.appendChild(input); // must be in DOM

    input.onchange = () => {
      if (input.files?.length) {
        importImages(Array.from(input.files));
      }
      document.body.removeChild(input); // clean up after
    };

    // Also clean up if user cancels without selecting
    input.addEventListener("cancel", () => {
      document.body.removeChild(input);
    });

    input.click();
  };
  const images = () => activeMedia()?.images ?? [];

  const drawScope = () => {
    const canvas = canvasRef;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = activeImage();
    if (!img?.bitmap) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const off = new OffscreenCanvas(128, 128);
    const oct = off.getContext("2d");
    if (!oct) return;
    oct.drawImage(img.bitmap, 0, 0, 128, 128);
    const data = oct.getImageData(0, 0, 128, 128).data;

    ctx.fillStyle = "#0a0a0d";
    ctx.fillRect(0, 0, 280, 130);

    const bins = Array.from({ length: 256 }, () => [0, 0, 0]);
    for (let i = 0; i < data.length; i += 4) {
      bins[data[i]][0]++;
      bins[data[i + 1]][1]++;
      bins[data[i + 2]][2]++;
    }

    const peak = Math.max(...bins.flatMap((b) => b)) || 1;
    const channels: Array<[number, string]> = [
      [0, "rgba(255,70,70,.6)"],
      [1, "rgba(70,200,100,.6)"],
      [2, "rgba(70,120,255,.6)"],
    ];

    for (const [ci, color] of channels) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 130);
      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * 280;
        const y = 130 - (bins[i][ci] / peak) * 124;
        i === 0 ? ctx.moveTo(x, 130) : ctx.lineTo(x, y);
      }
      ctx.lineTo(280, 130);
      ctx.closePath();
      ctx.fill();
    }
  };

  createEffect(() => {
    activeImage();
    zoomLevel();
    applyZoom();
  });

  createEffect(() => {
    if (!ui().showScopes) return;
    drawScope();
  });

  return (
    <div class="viewport">
      <style>{`
        .viewport {
          flex: 1;
          position: relative;
          display: flex;
          overflow: hidden;
          background: rgb(29, 29, 35);
        }
        .gl-container {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .split-handle {
          display: none;
          position: absolute;
          top: 0;
          bottom: 0;
          width: 32px;
          left: 50%;
          transform: translateX(-50%);
          cursor: ew-resize;
          align-items: center;
          justify-content: center;
          z-index: 15;
        }
        .split-handle.visible {
          display: flex;
        }
        .split-line {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          width: 2px;
          background: #fff;
          transform: translateX(-50%);
          box-shadow: 0 0 6px rgba(0,0,0,.5);
        }
        .split-knob {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255,255,255,.95);
          color: #111;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,.4);
          z-index: 1;
          flex-shrink: 0;
        }
        .split-label {
          position: absolute;
          top: 8px;
          padding: 2px 8px;
          border-radius: 99px;
          font-size: 10px;
          font-weight: 700;
          background: rgba(0,0,0,.55);
          color: rgba(255,255,255,.8);
          pointer-events: none;
          white-space: nowrap;
        }
        .split-label.before {
          right: calc(100% + 4px);
        }
        .split-label.after {
          left: calc(100% + 4px);
        }
        .viewport-overlay {
          position: absolute;
          bottom: 8px;
          left: 8px;
          right: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 4px;
          pointer-events: none;
          z-index: 10;
        }
        .zoom-group {
          display: flex;
          background: rgba(29,29,35,.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 3px;
          pointer-events: all;
        }
        .zoom-btn {
          width: 26px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border-radius: 4px;
          font-size: 12px;
          color: rgba(226, 226, 233, 0.6);
          background: none;
          border: none;
        }
        .zoom-btn:hover { background: rgba(255,255,255,0.08); }
        .zoom-label {
          min-width: 36px;
          text-align: center;
          padding: 0 4px;
          font-size: 11px;
          font-weight: 600;
          color: rgb(226, 226, 233);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .scopes-panel {
          display: none;
          background: rgba(10,10,13,.9);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          overflow: hidden;
          pointer-events: all;
        }
        .scopes-panel.visible { display: block; }
        .start-screen {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 1;
          background: rgb(29, 29, 35);
        }
        .start-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 28px;
        }
        .start-header img { height: 20px; }
        .start-version { font-size: 11px; opacity: 0.5; }
        .start-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 100%;
        }
        .start-bg {
          width: 100%;
          opacity: 0.5;
          max-height: 50vh;
          object-fit: contain;
        }
        .start-actions {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          flex-wrap: wrap;
          padding: 8px;
        }
        .action-btn {
          height: 36px;
          padding: 0 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 120ms;
        }
        .action-btn.secondary {
          background: rgba(255,255,255,0.1);
          color: rgb(226, 226, 233);
        }
        .action-btn.secondary:hover { background: rgba(255,255,255,0.15); }
        .action-btn.primary {
          background: #4d8af0;
          color: white;
          border-radius: 9999px;
        }
        .action-btn.primary:hover { background: #5a9aff; }
        .start-footer {
          padding: 24px 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
        .start-footer img { width: 14px; height: 14px; opacity: 0.5; }
        .start-footer-text {
          max-width: 240px;
          font-size: 11px;
          opacity: 0.5;
          line-height: 1.5;
        }
        .image-strip {
          display: none;
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: rgb(29, 29, 35);
          border-top: 1px solid rgba(255,255,255,0.05);
          flex-direction: row;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          overflow-x: auto;
          z-index: 5;
        }
        .image-strip.visible { display: flex; }
        .strip-thumb {
          flex-shrink: 0;
          width: 72px;
          height: 52px;
          border-radius: 4px;
          overflow: hidden;
          cursor: pointer;
          border: 1.5px solid transparent;
          transition: border-color 120ms;
        }
        .strip-thumb.active {
          border-color: #4d8af0;
        }
        .strip-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .add-image-btn {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          border-radius: 4px;
          background: rgba(255,255,255,0.05);
          border: 1.5px dashed rgba(255,255,255,0.15);
          color: rgba(226, 226, 233, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .add-image-btn:hover { background: rgba(255,255,255,0.08); }
      `}</style>

      <div
        class="gl-container"
        ref={containerRef}
        onWheel={handleWheel}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      />

      <div
        class={`split-handle ${ui().viewMode === "split" ? "visible" : ""}`}
        style={{ left: `${ui().splitX * 100}%` }}
        onPointerDown={handleSplitPointerDown}
        onPointerMove={handleSplitPointerMove}
        onPointerUp={handleSplitPointerUp}
        onPointerCancel={handleSplitPointerUp}
      >
        <div class="split-line" />
        <div class="split-knob">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M4 3l-3 4 3 4M10 3l3 4-3 4"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <span class="split-label before">Before</span>
        <span class="split-label after">After</span>
      </div>

      <div class="viewport-overlay">
        <Show when={activeImage()}>
          <div class="zoom-group">
          <button class="zoom-btn" onClick={zoomOut}>
            −
          </button>
          <button class="zoom-label" onClick={zoomFit}>
            {zoomLevel() === "fit" ? "Fit" : `${zoomLevel()}%`}
          </button>
          <button class="zoom-btn" onClick={zoomIn}>
            +
          </button>
          </div>
        </Show>
        <div style={{ flex: 1 }} />
        <div class={`scopes-panel ${ui().showScopes ? "visible" : ""}`}>
          <canvas ref={canvasRef} width="280" height="130" />
        </div>
      </div>

      <Show when={!activeImage()}>
        <div class="start-screen">
          <header class="start-header">
            <img src="/assets/cio_logo.svg" alt="Color.io" />
            <span class="start-version">Version 3.3.3</span>
          </header>
          <section class="start-content">
            <img
              class="start-bg"
              src="/assets/img/cio_gallery.avif"
              alt="Gallery"
            />
            <div class="start-actions">
              <button
                class="action-btn secondary"
                onClick={() => setUI("overlay", "projects")}
              >
                Create Project
              </button>
              <button class="action-btn primary" onClick={handleOpenImages}>
                Open Image(s)
              </button>
            </div>
          </section>
          <footer class="start-footer">
            <img src="/assets/icons/hand_icon.svg" alt="" />
            <div class="start-footer-text">
              <strong>Your images are never uploaded.</strong> Color.io works
              offline on your device.
            </div>
          </footer>
        </div>
      </Show>

      <div class={`image-strip ${images().length > 0 ? "visible" : ""}`}>
        {images().map((img) => (
          <div
            class={`strip-thumb ${img.id === activeMedia()?.activeImageId ? "active" : ""}`}
            onClick={() => setActiveImage(img.id)}
          >
            <img src={img.thumbnailURL} alt={img.name} />
          </div>
        ))}
        <button class="add-image-btn" onClick={handleOpenImages}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 3v10M3 8h10"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
