# Color.io Rebuild Spec (Vanilla -> `fe`)

Reference runtime: `http://127.0.0.1:5501/index.html`  
Reference source: `D:/graco/colorio-vanilla/js`

## A) Module Map

Vanilla modules:
- `js/app.js`: app bootstrap, element registration, top-level wiring
- `js/lib/state.js`: app state, project/media/edit history, ui state, events
- `js/lib/defaults.js`: default edit state and per-panel defaults
- `js/panels/index.js`: panel registry + panel builders (presets/match/balance/.../snapshots)
- `js/viewport/renderer.js`: WebGL renderer + shader pipeline + split view
- `js/elements/*.js`: reusable controls (curve, knob, sliders, selectors)

Target modules in `fe`:
- `src/components/ColorIO.tsx`: app shell bootstrap
- `src/context/ColorIOContext.tsx`: typed app state + actions + history + renderer bridge
- `src/components/colorio/Sidebar.tsx`: panel system and panel control logic
- `src/components/colorio/PresetsPanel.tsx`: preset loading/search/apply/color-space selectors
- `src/components/colorio/MatchPanel.tsx`: match references + match controls
- `src/components/colorio/Viewport.tsx`: canvas viewport, start screen, zoom/split/scope UI
- `src/lib/renderer.ts`: shader renderer and edit uniform application

## B) Data Model

Canonical runtime entities (already modeled in `ColorIOContext`):
- `Project`: project-level container
- `MediaItem`: image set + active image + edit state + snapshots
- `ImageItem`: bitmap + metadata + thumbnail URL
- `EditState`: per-panel editable state + bypass flags
- `UIState`: active/open panels, overlays, view mode/split/zoom/scope/global bypass
- `Snapshot`: named saved edit-state checkpoint

Critical parity constraints:
- History and snapshot operations must clone edit state (no accidental shared refs)
- Panel reset uses defaults from one source of truth
- Per-panel bypass must map to render-path bypass or neutral uniforms

## C) UI Component Tree

Current `fe` tree (targeting parity):
- `ColorIO`
- `TopBar`
- `main`
- `Viewport`
- `Sidebar`
- `PresetsPanel`
- `MatchPanel`
- `CurveEditor` (embedded in sidebar)
- `Overlays`
- `Toasts`

Panel inventory expected by runtime:
- `presets`, `match`, `balance`, `exposure`, `contrast`, `scattering`,
  `refraction`, `density`, `chroma`, `radiance`, `saturation`,
  `rgb`, `spotlight`, `halation`, `diffusion`, `texture`, `snapshots`

## D) Renderer / Effects Plan

Current renderer covers:
- `balance`, `rgb`, `halation`, `diffusion` (partial), `texture` (partial), `spotlight` (partial), split mode, global bypass

Required for behavioral parity:
- Add curve-driven transforms: `exposure`, `contrast`, `density`, `chroma`, `radiance`, `saturation`
- Add vector controls: `scattering`, `refraction`
- Complete effects fields:
  - `texture.resolution`
  - `diffusion.threshold/focus/focusX/focusY`
  - `spotlight.pop` usage
- Ensure panel bypass behavior exactly matches runtime semantics

## Slice Order

1. Shell/Layout  
2. Panel System  
3. State/History  
4. Rendering Pipeline  
5. Import/Export  
6. Presets  

Each slice updates `PARITY_REPORT.md` with:
- checks run
- pass/fail summary
- concrete gaps and fixes

