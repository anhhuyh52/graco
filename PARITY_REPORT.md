# PARITY REPORT

Target runtime: `http://127.0.0.1:5501/index.html`  
Target mode: pixel-aware UI parity + behavioral parity  
Project: `D:/graco/fe`

## Contrast Curve Follow-Up

Checks run:
- Compared against supplied runtime screenshot for the 2-point Contrast Curve state
- Reviewed FE curve editor point-count and rolling-surface behavior

Result: `PARTIAL PASS`
- Pass: `Contrast Curve` now switches to the runtime-like two interior points at `x=1/3,y=.25` and `x=2/3,y=.75` when reduced to 2 points
- Pass: two-point curve rendering now extends flat to the left and right edges before/after the two editable points
- Pass: two-point contrast mode forces `Linear`, matching the screenshot state
- Pass: contrast rolling surface now drives `smartContrast` instead of offsetting curve points; the separate Smart slider was removed from the panel UI
- Gap: smart-contrast shader response still needs visual tuning against real image samples from the runtime app

---

## Baseline (2026-05-10)

Status:
- Architecture and rebuild scope defined in [REBUILD_SPEC.md](D:/graco/fe/REBUILD_SPEC.md)
- Core panel/state scaffolding exists
- Full behavioral parity not yet reached

Known major gaps:
- Renderer does not yet apply all panel logic (`exposure/contrast/scattering/refraction/density/chroma/radiance/saturation`)
- Some UI behaviors are approximated rather than matching runtime interactions exactly
- Export and preset-library generator flows are still partial

---

## Slice 1: Shell/Layout

Checks run:
- Verified app shell structure in `ColorIO.tsx`, `Viewport.tsx`, `TopBar.tsx`, `Sidebar.tsx`
- Compared runtime DOM shape (top bar, main viewport, aside panel stack, overlays)

Result: `PARTIAL`
- Pass: top-level shell and main regions are present
- Gap: start screen and shell spacing/visual hierarchy still diverge in details

Changes made this cycle:
- Updated start-screen layout in `Viewport` to runtime-like centered card composition:
  - bounded card container with border/radius
  - header/content/footer spacing tuned to app proportions
  - gallery background switched to low-opacity cover treatment
  - actions remain centered over gallery region

---

## Slice 2: Panel System

Checks run:
- Verified panel inventory against vanilla `buildPanels` registry
- Verified panel open/toggle/bypass/reset wiring in sidebar
- Verified contrast curve controls (`Points / interpolation / Reset`) and validation hardening

Result: `PARTIAL`
- Pass: all expected panels exist and are wired in UI state
- Pass: panel input validation/clamping was improved
- Gap: some panel control micro-behaviors still differ from vanilla custom elements

Changes made this cycle:
- `Sidebar`: interactive point-count control + validation/accessibility hardening

---

## Slice 3: State/History

Checks run:
- Reviewed `ColorIOContext` history stack, undo/redo, snapshot operations, immutable updates
- Compared with vanilla `state.js` behavior

Result: `PASS (improved vs vanilla)`
- Pass: immutable updates and renderer sync are stronger than mutable vanilla pattern
- Gap: no automated tests currently validating history edge cases

---

## Slice 4: Rendering Pipeline

Checks run:
- Compared `src/lib/renderer.ts` edit-state usage against runtime panel inventory

Result: `FAIL (parity incomplete)`
- Pass: base grading + split + core effects path exists
- Pass: `exposure` and `contrast` curves are now wired into shader render path
- Fail: missing panel-to-render integration for remaining curve/vector panels
- Fail: partial effect fields unused (`spotlight.pop`, diffusion advanced controls, texture resolution)

Changes made this cycle:
- Renderer update in `src/lib/renderer.ts`:
  - Added exposure-curve uniforms and curve sampling
  - Added contrast-curve uniforms and curve sampling
  - Added `smartContrast` influence in contrast mapping
  - Added safe curve-point normalization and fallback identities
  - Added `spotlight.pop` contribution
  - Added full diffusion controls in shader path (`threshold`, `focus`, `focus center`)
  - Added `texture.resolution` contribution in shader path
  - Added `scattering` uniforms + shader transform
  - Added `refraction` uniforms + threshold split transform
  - Added curve-family shader integration for `density`, `chroma`, `radiance`, `saturation`
  - Added uniform wiring for all four curve families in `applyEditState`

---

## Slice 5: Import/Export

Checks run:
- Verified image import flow and active-image switching
- Checked overlay-driven export/project flows

Result: `PARTIAL`
- Pass: image import, drag/drop, active image strip
- Gap: full export parity against runtime not complete

---

## Slice 6: Presets

Checks run:
- Verified preset JSON loading, pack filter, search, apply
- Verified metadata filtering when applying presets

Result: `PARTIAL`
- Pass: basic preset workflow operational with safer apply behavior
- Pass: runtime-like Preset Library and Spectra Generator modal flows now exist in FE
- Pass: generator now maps selected variant to concrete edit-state transforms
- Gap: variant generation still uses synthetic proposals instead of runtime model output

---

## Next Implementation Queue

1. Slice 1 Shell/Layout: align start screen/card proportions and viewport shell spacing
2. Slice 4 Rendering: tune curve/effect response against runtime values
3. Slice 6 Presets: refine variant proposal quality and save/export flow parity
4. Add minimal parity smoke checks (state/history/panel interactions)

---

## Calibration Log (Renderer)

Latest tuning pass in `src/lib/renderer.ts`:
- Reduced exposure-curve EV span to avoid overreaction near midtones
- Reduced contrast-curve blend strength (respecting `smartContrast`)
- Reduced density/chroma saturation gain multipliers
- Reduced radiance EV multiplier
- Reduced saturation-curve gain
- Reworked curve uniform generation to sample the selected interpolation (`Cubic`, `Bezier`, `Linear`) into a 32-step lookup before sending it to the shader
- Updated contrast curve point-count changes to preserve shape like vanilla `spline-interface.setPointCount()`:
  - adding points inserts into the largest gap and samples the existing curve
  - removing points drops the least-impact interior point
- Updated point-count control to support vertical drag, matching the browser app interaction more closely

Intent:
- keep defaults visually neutral
- preserve panel responsiveness
- better match runtime’s softer analog-style transitions

Verification:
- `node node_modules/vite/bin/vite.js build` completed the Vite client and SSR transforms.
- Build then failed in Nitro bundling because `entry-server.js` imports `defineHandler` from `h3`, which the installed `h3` package does not export. This appears unrelated to the contrast-curve edits.
