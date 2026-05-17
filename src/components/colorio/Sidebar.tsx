/**
 * Sidebar.tsx
 *
 * Thin orchestrator - assembles all panels.
 * No math, no CSS, no interaction logic here.
 *
 * Architecture:
 *   CSS:    sidebar/sidebar.css, curve/curve.css
 *   Panels: panels/ (one folder per panel)
 *   Curves: curve/CurveEditor.tsx
 *   Math:   core/curves/, core/interpolation/, core/tone/
 */

import "./sidebar/sidebar.css";
import "./curve/curve.css";

import { useColorIO } from "../../context/ColorIOContext";
import { PanelSection } from "./panels/PanelSection";

// Panels
import { PresetsPanel } from "./PresetsPanel";
import { MatchPanel } from "./MatchPanel";
import { BalancePanel } from "./panels/balance/BalancePanel";
import { ExposurePanel } from "./panels/exposure/ExposurePanel";
import { ContrastPanel } from "./panels/contrast/ContrastPanel";
import { ScatteringPanel } from "./panels/scattering/ScatteringPanel";
import { RefractionPanel } from "./panels/refraction/RefractionPanel";
import { DensityPanel } from "./panels/density/DensityPanel";
import { ChromaPanel } from "./panels/chroma/ChromaPanel";
import { RadiancePanel } from "./panels/radiance/RadiancePanel";
import { SaturationPanel } from "./panels/saturation/SaturationPanel";
import { RGBPanel } from "./panels/rgb/RGBPanel";
import { TexturePanel } from "./panels/texture/TexturePanel";
import { SpotlightPanel } from "./panels/spotlight/SpotlightPanel";
import { HalationPanel } from "./panels/halation/HalationPanel";
import { DiffusionPanel } from "./panels/diffusion/DiffusionPanel";
import { SnapshotsPanel } from "./panels/snapshots/SnapshotsPanel";

export function Sidebar() {
  const { ui, togglePanel, editState, saveSnapshot, resetPanel, setEdit } =
    useColorIO();

  const isOpen = (id: string) => ui().openPanels.has(id);

  /** Generic bypass toggle — works for any panel key that has a bypass flag. */
  const toggleBypass = (panel: string) =>
    setEdit(
      (s) => {
        const section = (s as any)[panel];
        if (section && "bypass" in section) section.bypass = !section.bypass;
      },
      `${panel} bypass`,
    );

  const handleSaveSnapshot = () => {
    const name = prompt("Snapshot name:")?.trim();
    if (name) saveSnapshot(name);
  };

  return (
    <aside class="sidebar">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div class="sidebar-header">
        <span class="sidebar-title">Adjustments</span>
        <button
          class="snapshot-btn"
          onClick={handleSaveSnapshot}
          title="Save Snapshot (⌘S)"
          id="btn-save-snapshot"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 3v8M3 7h8"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      {/* ── Panels ──────────────────────────────────────────────────────── */}
      <div class="panels-container">

        {/* Presets */}
        <PanelSection
          id="presets"
          title="Presets"
          icon="/assets/icons/presets_icon.svg"
          isOpen={isOpen("presets")}
          onToggle={() => togglePanel("presets")}
        >
          <PresetsPanel />
        </PanelSection>

        {/* Match */}
        <PanelSection
          id="match"
          title="Match"
          icon="/assets/icons/match_icon.svg"
          isOpen={isOpen("match")}
          onToggle={() => togglePanel("match")}
        >
          <MatchPanel />
        </PanelSection>

        {/* Balance */}
        <PanelSection
          id="balance"
          title="Balance"
          icon="/assets/icons/balance_icon.svg"
          isOpen={isOpen("balance")}
          bypassed={editState().balance.bypass}
          onToggle={() => togglePanel("balance")}
          onBypassToggle={() => toggleBypass("balance")}
          onReset={() => resetPanel("balance")}
        >
          <BalancePanel />
        </PanelSection>

        {/* Exposure Curve */}
        <PanelSection
          id="exposure"
          title="Exposure Curve"
          icon="/assets/icons/brightness_contrast_icon.svg"
          isOpen={isOpen("exposure")}
          bypassed={editState().exposure.bypass}
          onToggle={() => togglePanel("exposure")}
          onBypassToggle={() => toggleBypass("exposure")}
          onReset={() => resetPanel("exposure")}
        >
          <ExposurePanel />
        </PanelSection>

        {/* Contrast Curve */}
        <PanelSection
          id="contrast"
          title="Contrast Curve"
          icon="/assets/icons/luminance_curve_icon.svg"
          isOpen={isOpen("contrast")}
          bypassed={editState().contrast.bypass}
          onToggle={() => togglePanel("contrast")}
          onBypassToggle={() => toggleBypass("contrast")}
          onReset={() => resetPanel("contrast")}
        >
          <ContrastPanel />
        </PanelSection>

        {/* Scattering */}
        <PanelSection
          id="scattering"
          title="Scattering"
          icon="/assets/icons/scatter_icon.svg"
          isOpen={isOpen("scattering")}
          bypassed={editState().scattering.bypass}
          onToggle={() => togglePanel("scattering")}
          onBypassToggle={() => toggleBypass("scattering")}
          onReset={() => resetPanel("scattering")}
        >
          <ScatteringPanel />
        </PanelSection>

        {/* Refraction */}
        <PanelSection
          id="refraction"
          title="Refraction"
          icon="/assets/icons/refract_icon.svg"
          isOpen={isOpen("refraction")}
          bypassed={editState().refraction.bypass}
          onToggle={() => togglePanel("refraction")}
          onBypassToggle={() => toggleBypass("refraction")}
          onReset={() => resetPanel("refraction")}
        >
          <RefractionPanel />
        </PanelSection>

        {/* Density Curve */}
        <PanelSection
          id="density"
          title="Density Curve"
          icon="/assets/icons/density_vs_hue_icon.svg"
          isOpen={isOpen("density")}
          bypassed={editState().density.bypass}
          onToggle={() => togglePanel("density")}
          onBypassToggle={() => toggleBypass("density")}
          onReset={() => resetPanel("density")}
        >
          <DensityPanel />
        </PanelSection>

        {/* Chroma Curve */}
        <PanelSection
          id="chroma"
          title="Chroma Curve"
          icon="/assets/icons/chroma_icon.svg"
          isOpen={isOpen("chroma")}
          bypassed={editState().chroma.bypass}
          onToggle={() => togglePanel("chroma")}
          onBypassToggle={() => toggleBypass("chroma")}
          onReset={() => resetPanel("chroma")}
        >
          <ChromaPanel />
        </PanelSection>

        {/* Radiance Curve */}
        <PanelSection
          id="radiance"
          title="Radiance Curve"
          icon="/assets/icons/radiance_curve_icon.svg"
          isOpen={isOpen("radiance")}
          bypassed={editState().radiance.bypass}
          onToggle={() => togglePanel("radiance")}
          onBypassToggle={() => toggleBypass("radiance")}
          onReset={() => resetPanel("radiance")}
        >
          <RadiancePanel />
        </PanelSection>

        {/* Saturation Curve */}
        <PanelSection
          id="saturation"
          title="Saturation Curve"
          icon="/assets/icons/saturation_icon.svg"
          isOpen={isOpen("saturation")}
          bypassed={editState().saturation.bypass}
          onToggle={() => togglePanel("saturation")}
          onBypassToggle={() => toggleBypass("saturation")}
          onReset={() => resetPanel("saturation")}
        >
          <SaturationPanel />
        </PanelSection>

        {/* Shadow / Highlight RGB */}
        <PanelSection
          id="rgb"
          title="Shadow Highlight"
          icon="/assets/icons/sliders_icon.svg"
          isOpen={isOpen("rgb")}
          bypassed={editState().rgb.bypass}
          onToggle={() => togglePanel("rgb")}
          onBypassToggle={() => toggleBypass("rgb")}
          onReset={() => resetPanel("rgb")}
        >
          <RGBPanel />
        </PanelSection>

        {/* Texture */}
        <PanelSection
          id="texture"
          title="Texture"
          icon="/assets/icons/grain_icon.svg"
          isOpen={isOpen("texture")}
          bypassed={editState().texture.bypass}
          onToggle={() => togglePanel("texture")}
          onBypassToggle={() => toggleBypass("texture")}
          onReset={() => resetPanel("texture")}
        >
          <TexturePanel />
        </PanelSection>

        {/* Spotlight */}
        <PanelSection
          id="spotlight"
          title="Spotlight"
          icon="/assets/icons/relight_icon.svg"
          isOpen={isOpen("spotlight")}
          bypassed={editState().spotlight.bypass}
          onToggle={() => togglePanel("spotlight")}
          onBypassToggle={() => toggleBypass("spotlight")}
          onReset={() => resetPanel("spotlight")}
        >
          <SpotlightPanel />
        </PanelSection>

        {/* Halation */}
        <PanelSection
          id="halation"
          title="Halation"
          icon="/assets/icons/halation_icon.svg"
          isOpen={isOpen("halation")}
          bypassed={editState().halation.bypass}
          onToggle={() => togglePanel("halation")}
          onBypassToggle={() => toggleBypass("halation")}
          onReset={() => resetPanel("halation")}
        >
          <HalationPanel />
        </PanelSection>

        {/* Diffusion */}
        <PanelSection
          id="diffusion"
          title="Diffusion"
          icon="/assets/icons/diffusion_icon.svg"
          isOpen={isOpen("diffusion")}
          bypassed={editState().diffusion.bypass}
          onToggle={() => togglePanel("diffusion")}
          onBypassToggle={() => toggleBypass("diffusion")}
          onReset={() => resetPanel("diffusion")}
        >
          <DiffusionPanel />
        </PanelSection>

        {/* Snapshots */}
        <PanelSection
          id="snapshots"
          title="Snapshots"
          icon="/assets/icons/save_icon.svg"
          isOpen={isOpen("snapshots")}
          onToggle={() => togglePanel("snapshots")}
        >
          <SnapshotsPanel />
        </PanelSection>

      </div>
    </aside>
  );
}
