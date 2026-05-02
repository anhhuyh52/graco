import { ColorIOProvider } from "../context/ColorIOContext";
import { TopBar } from "./colorio/TopBar";
import { Viewport } from "./colorio/Viewport";
import { Sidebar } from "./colorio/Sidebar";
import { Overlays } from "./colorio/Overlays";
import { Toasts } from "./colorio/Toasts";
import "../css/package.min.css";

function ColorIOContent() {
  return (
    <div id="color-io" class="colorio-layout">
      <style>{`
        .colorio-layout {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--theme-surface-000);
          overflow: hidden;
        }
        .colorio-layout > main {
          flex: 1;
          display: flex;
          min-height: 0;
          overflow: hidden;
          background: var(--theme-surface-000);
        }
      `}</style>
      <TopBar />
      <main>
        <Viewport />
        <Sidebar />
      </main>
      <Overlays />
      <Toasts />
    </div>
  );
}

export default function ColorIO() {
  return (
    <div id="colorio-wrapper" class="colorio-root">
      <style>{`
        .colorio-root {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100vh;
          height: 100svh;
          overflow: hidden;
          color: rgb(226, 226, 233);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
          user-select: none;
          touch-action: none;
        }
      `}</style>
      <ColorIOProvider>
        <ColorIOContent />
      </ColorIOProvider>
    </div>
  );
}
