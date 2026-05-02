import { createSignal, createResource, For, Show } from "solid-js";
import { useColorIO, type EditState } from "../../context/ColorIOContext";

const ALL_PACKS_SENTINEL = "__ALL__";

const PACKS = [
  { id: "custom", name: "Custom" },
  {
    id: "cinestill",
    name: "CineStill",
    thumb: "/assets/img/preset_packs/cinestill.jpg",
  },
  {
    id: "kodak-still",
    name: "Kodak Still",
    thumb: "/assets/img/preset_packs/kodak_still.jpg",
  },
  {
    id: "fuji-still",
    name: "Fuji Still",
    thumb: "/assets/img/preset_packs/fuji_still.jpg",
  },
  {
    id: "kodak-motion-picture",
    name: "Kodak Motion Picture",
    thumb: "/assets/img/preset_packs/kodak_motion_picture.jpg",
  },
  {
    id: "fuji-print-film",
    name: "Fuji Print Film",
    thumb: "/assets/img/preset_packs/fuji_print_film.jpg",
  },
  {
    id: "minolta-konica",
    name: "Minolta Konica",
    thumb: "/assets/img/preset_packs/minolta_konica.jpg",
  },
  {
    id: "tetrachrome",
    name: "TetraChrome",
    thumb: "/assets/img/preset_packs/tetrachrome.jpg",
  },
  {
    id: "visioncolor-osiris",
    name: "VisionColor OSIRIS",
    thumb: "/assets/img/preset_packs/visioncolor_osiris.jpg",
  },
  {
    id: "vsco-essentials",
    name: "VSCO Essentials",
    thumb: "/assets/img/preset_packs/vsco_essentials.jpg",
  },
];

// Exhaustive list of keys that belong to EditState.
// Used to filter out preset metadata (name, meta, packName, etc.) that should
// never be merged into the live edit state.
// FIX: previously Object.assign(s, preset) injected every key from the JSON.
const EDIT_STATE_KEYS: ReadonlyArray<keyof EditState> = [
  "inputColorSpace",
  "outputColorSpace",
  "balance",
  "exposure",
  "contrast",
  "scattering",
  "refraction",
  "density",
  "chroma",
  "radiance",
  "saturation",
  "rgb",
  "spotlight",
  "halation",
  "diffusion",
  "texture",
  "match",
] as const;

const INPUT_COLORSPACES = [
  { id: "sRGB", label: "sRGB", group: "Generic" },
  { id: "Rec709", label: "Rec709", group: "Generic" },
  { id: "Rec2020", label: "Rec2020", group: "Generic" },
  { id: "AdobeRGB", label: "Adobe RGB", group: "Generic" },
  { id: "ProPhotoRGB", label: "ProPhoto RGB", group: "Generic" },
  { id: "DisplayP3_IDT", label: "Display P3", group: "Generic" },
  { id: "P3D60_CSC", label: "P3 (D60)", group: "Generic" },
  { id: "P3D65_CSC", label: "P3 (D65)", group: "Generic" },
  { id: "Cineon_IDT", label: "Cineon (709)", group: "Generic" },
  { id: "EXR_IDT", label: "EXR (709)", group: "Generic" },
  { id: "ACES_CCT", label: "ACEScct", group: "Generic" },
  {
    id: "DaVinci_WideGamut_IDT",
    label: "DaVinci Wide Gamut Intermediate",
    group: "Generic",
  },
  { id: "VisionLog", label: "Standard RAW", group: "Raw Development" },
  { id: "VisionLogFlat", label: "Flat RAW", group: "Raw Development" },
  { id: "FilmNegative", label: "Film Negative", group: "Analog Film" },
  {
    id: "VisionLogFilmNegative",
    label: "RAW Film Negative",
    group: "Analog Film",
  },
  { id: "ArriLogC", label: "Arri Log-C v3", group: "Arri" },
  { id: "ArriAlexa35", label: "Arri Log-C v4", group: "Arri" },
  { id: "AppleLog", label: "Apple ProRes Log", group: "Apple" },
  { id: "AppleHLG", label: "Apple ProRes HDR", group: "Apple" },
  {
    id: "BlackMagicDesignWideGamutGen5",
    label: "BMDFilm WideGamut Gen. 5",
    group: "Blackmagic Design",
  },
  { id: "BMD_4k_Film", label: "BMDFilm 4k", group: "Blackmagic Design" },
  { id: "BMD_4_6k_Film", label: "BMDFilm 4.6k", group: "Blackmagic Design" },
  {
    id: "BMD_Pocket_4k_Film",
    label: "BMDFilm Pocket 4k",
    group: "Blackmagic Design",
  },
  {
    id: "BMD_Pocket_6k_Film",
    label: "BMDFilm Pocket 6k",
    group: "Blackmagic Design",
  },
  {
    id: "BMD_Broadcast_Film",
    label: "BMDFilm Broadcast",
    group: "Blackmagic Design",
  },
  {
    id: "BMD_Cinema_Camera_Film",
    label: "BMDFilm Cinema Camera",
    group: "Blackmagic Design",
  },
  {
    id: "BolexLogWideGamutRGB",
    label: "BolexLog WideGamutRGB",
    group: "Bolex",
  },
  {
    id: "CanonLogBT2020_Daylight",
    label: "CanonLog BT2020 (Daylight)",
    group: "Canon",
  },
  {
    id: "CanonLogBT2020_Tungsten",
    label: "CanonLog BT2020 (Tungsten)",
    group: "Canon",
  },
  {
    id: "CanonLogCinemaGamut_Daylight",
    label: "CanonLog CinemaGamut (Daylight)",
    group: "Canon",
  },
  {
    id: "CanonLogCinemaGamut_Tungsten",
    label: "CanonLog CinemaGamut (Tungsten)",
    group: "Canon",
  },
  {
    id: "CanonLog2BT2020_Daylight",
    label: "CanonLog2 BT2020 (Daylight)",
    group: "Canon",
  },
  {
    id: "CanonLog2BT2020_Tungsten",
    label: "CanonLog2 BT2020 (Tungsten)",
    group: "Canon",
  },
  {
    id: "CanonLog2CinemaGamut_Daylight",
    label: "CanonLog2 CinemaGamut (Daylight)",
    group: "Canon",
  },
  {
    id: "CanonLog2CinemaGamut_Tungsten",
    label: "CanonLog2 CinemaGamut (Tungsten)",
    group: "Canon",
  },
  {
    id: "CanonLog3BT2020_Daylight",
    label: "CanonLog3 BT2020 (Daylight)",
    group: "Canon",
  },
  {
    id: "CanonLog3BT2020_Tungsten",
    label: "CanonLog3 BT2020 (Tungsten)",
    group: "Canon",
  },
  {
    id: "CanonLog3CinemaGamut_Daylight",
    label: "CanonLog3 CinemaGamut (Daylight)",
    group: "Canon",
  },
  {
    id: "CanonLog3CinemaGamut_Tungsten",
    label: "CanonLog3 CinemaGamut (Tungsten)",
    group: "Canon",
  },
  { id: "DJI_DLogDGamut", label: "D-LOG D-Gamut", group: "DJI" },
  { id: "DJI_DLogMDGamut", label: "D-LOG M D-Gamut", group: "DJI" },
  { id: "Fuji_FLogFGamut", label: "F-LOG F-Gamut", group: "Fuji" },
  { id: "FujiFLog2FGamut", label: "F-LOG2 F-Gamut", group: "Fuji" },
  { id: "GoPro_ProTuneFlat", label: "ProTune Flat", group: "GoPro" },
  { id: "Kinefinity_KineLog3", label: "KineLog3", group: "Kinefinity" },
  { id: "LeicaLLog", label: "L-Log BT2020", group: "Leica" },
  { id: "Nikon_NLogBT2020", label: "N-LOG BT2020", group: "Nikon" },
  {
    id: "OM_Log_BT2020",
    label: "OM-Log 400 BT2020",
    group: "Olympus / OM System",
  },
  {
    id: "OM_Log_P3D65",
    label: "OM-Log 400 P3-D65",
    group: "Olympus / OM System",
  },
  { id: "Sony_SLogSGamut", label: "S-Log S-Gamut", group: "Sony" },
  {
    id: "Sony_SLog2SGamut_Daylight",
    label: "S-Log2 S-Gamut (Daylight)",
    group: "Sony",
  },
  {
    id: "Sony_SLog2SGamut_Tungsten",
    label: "S-Log2 S-Gamut (Tungsten)",
    group: "Sony",
  },
  { id: "Sony_SLog3SGamut3", label: "S-Log3 S-Gamut3", group: "Sony" },
  {
    id: "Sony_SLog3SGamut3_Cine",
    label: "S-Log3 S-Gamut3.Cine",
    group: "Sony",
  },
  {
    id: "Sony_Venice_SLog3SGamut3",
    label: "Venice S-Log3 S-Gamut3",
    group: "Sony",
  },
  {
    id: "Sony_Venice_SLog3SGamut3_Cine",
    label: "Venice S-Log3 S-Gamut3.Cine",
    group: "Sony",
  },
  { id: "Panasonic_VLogVGamut", label: "V-Log V-Gamut", group: "Panasonic" },
  {
    id: "RedLog3G10WideGamutRGB",
    label: "LOG3G10 REDWideGamutRGB",
    group: "RED",
  },
  {
    id: "REDLogFilmDragonColor",
    label: "REDLogFilm DragonColor",
    group: "RED",
  },
  {
    id: "REDLogFilmDragonColor2",
    label: "REDLogFilm DragonColor2",
    group: "RED",
  },
  { id: "REDLogFilmRedColor", label: "REDLogFilm REDColor", group: "RED" },
  { id: "REDLogFilmRedColor2", label: "REDLogFilm REDColor2", group: "RED" },
  { id: "RedLogFilmRedColor3", label: "REDLogFilm REDColor3", group: "RED" },
  { id: "RedLogFilmRedColor4", label: "REDLogFilm REDColor4", group: "RED" },
  { id: "ZCam_ZLog2", label: "Z-Log2", group: "ZCam" },
];

const OUTPUT_COLORSPACES = [
  { id: "sRGB", label: "sRGB", group: "SDR Display" },
  { id: "Rec709", label: "Rec709", group: "SDR Display" },
  { id: "Rec2020", label: "Rec2020", group: "SDR Display" },
  { id: "AdobeRGB", label: "Adobe RGB", group: "SDR Display" },
  { id: "DisplayP3_ODT", label: "Display P3", group: "SDR Display" },
  { id: "P3D60_CSC", label: "P3 (D60)", group: "SDR Display" },
  { id: "P3D65_CSC", label: "P3 (D65)", group: "SDR Display" },
  {
    id: "Rec2020_ST2084_HDR",
    label: "HDR Display (BT2020-ST2084)",
    group: "HDR & Cinema",
  },
  { id: "P3_DCI_D60", label: "DCI-P3 Projector (D60)", group: "HDR & Cinema" },
  { id: "P3_DCI_D65", label: "DCI-P3 Projector (D65)", group: "HDR & Cinema" },
  { id: "ArriLogC4", label: "Arri Log-C v4", group: "Cinema Cameras" },
  { id: "ArriRec709", label: "Arri REC 709 (SDR)", group: "Cinema Cameras" },
  { id: "ArriRec2020", label: "Arri REC 2020 (SDR)", group: "Cinema Cameras" },
  {
    id: "RED_Log3G10_WideGamutRGB",
    label: "RED LOG3G10",
    group: "Cinema Cameras",
  },
  {
    id: "Kodak2383_Rec709",
    label: "Kodak 2383 Rec709",
    group: "Print Film Emulation",
  },
  {
    id: "Kodak2383_ACEScct",
    label: "Kodak 2383 ACEScct",
    group: "Print Film Emulation",
  },
];

// ── Preset loader ──────────────────────────────────────────────────────────────
async function fetchPresets() {
  const allPresets: any[] = [];
  for (const pack of PACKS) {
    if (pack.id === "custom") continue;
    try {
      const res = await fetch(
        `/assets/presets/official/${encodeURIComponent(pack.name)}.json`,
      );
      if (!res.ok) continue;
      const data = await res.json();
      const presets: any[] = Array.isArray(data) ? data : (data.presets ?? []);
      for (const preset of presets) {
        allPresets.push({ ...preset, _packName: pack.name });
      }
    } catch (e) {
      console.warn(`Failed to load preset pack: ${pack.name}`, e);
    }
  }
  return allPresets;
}

// ── Group helpers ──────────────────────────────────────────────────────────────
function groupBy<T extends { group: string }>(items: T[]) {
  const map: Record<string, T[]> = {};
  for (const item of items) {
    (map[item.group] ??= []).push(item);
  }
  return map;
}

export function PresetsPanel() {
  const { setEdit, showToast, editState } = useColorIO();
  const [currentPack, setCurrentPack] = createSignal(ALL_PACKS_SENTINEL);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [isSearching, setIsSearching] = createSignal(false);
  const [presets] = createResource(fetchPresets);

  const groupedInputCS = () => groupBy(INPUT_COLORSPACES);
  const groupedOutputCS = () => groupBy(OUTPUT_COLORSPACES);

  const filteredPresets = () => {
    const all = presets() ?? [];
    const pack = currentPack();
    const query = searchQuery().toLowerCase().trim();

    return all.filter((p) => {
      const packMatch = pack === ALL_PACKS_SENTINEL || p._packName === pack;
      const queryMatch =
        !query ||
        (p.name ?? "").toLowerCase().includes(query) ||
        (p.meta?.description ?? "").toLowerCase().includes(query);
      return packMatch && queryMatch;
    });
  };

  // FIX: Object.assign(s, editData) injected every key from the JSON file —
  // including `name`, `meta`, `_packName`, etc. — corrupting the EditState shape.
  // Now we only copy keys that are known EditState members.
  const handleApplyPreset = (preset: any) => {
    setEdit(
      (s) => {
        for (const key of EDIT_STATE_KEYS) {
          if (
            key in preset &&
            preset[key] !== undefined &&
            preset[key] !== null
          ) {
            (s as any)[key] = preset[key];
          }
        }
      },
      `Preset: ${preset.name ?? "Unknown"}`,
    );
    showToast(`Applied "${preset.name ?? "preset"}"`, "success");
  };

  const handleCSChange = (type: "input" | "output", value: string) => {
    setEdit(
      (s) => {
        if (type === "input") s.inputColorSpace = value;
        else s.outputColorSpace = value;
      },
      `${type === "input" ? "Input" : "Output"} color space`,
    );
  };

  const handleLibrary = () => {
    showToast("Preset library is not connected yet", "info");
  };

  const handleGenerate = () => {
    showToast("Preset generator is not connected yet", "info");
  };

  const exitSearch = () => {
    setIsSearching(false);
    setSearchQuery("");
  };

  return (
    <div class="presets-panel">
      <style>{`
        .presets-panel {
          display: flex;
          flex-direction: column;
          gap: 8px;
          height: 100%;
        }

        /* ── Color space selectors ────────────────────────────────────────── */
        .cs-selectors {
          display: flex;
          gap: 4px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .cs-select {
          flex: 1;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 5px;
          color: rgba(226, 226, 233, 0.7);
          font-size: 10px;
          font-weight: 600;
          padding: 5px 6px;
          outline: none;
          cursor: pointer;
          transition: background 120ms;
          max-width: 50%;
        }
        .cs-select:hover { background: rgba(255,255,255,0.07); }
        .cs-select:focus { border-color: rgba(77,138,240,0.5); }

        /* ── Pack row ─────────────────────────────────────────────────────── */
        .presets-header {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .packs-scroll {
          flex: 1;
          display: flex;
          gap: 4px;
          overflow-x: auto;
          scrollbar-width: none;
          padding-bottom: 2px;
        }
        .packs-scroll::-webkit-scrollbar { display: none; }
        .pack-btn {
          white-space: nowrap;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          background: rgba(255,255,255,0.05);
          color: rgba(226, 226, 233, 0.45);
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 120ms;
          flex-shrink: 0;
        }
        .pack-btn:hover { background: rgba(255,255,255,0.08); color: rgba(226,226,233,.7); }
        .pack-btn.active {
          background: rgba(77, 138, 240, 0.15);
          border-color: rgba(77, 138, 240, 0.3);
          color: rgb(77, 138, 240);
        }

        /* ── Icon buttons ─────────────────────────────────────────────────── */
        .icon-btn {
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          cursor: pointer;
          border-radius: 4px;
          opacity: 0.45;
          transition: opacity 120ms, background 120ms;
          flex-shrink: 0;
        }
        .icon-btn:hover { opacity: 1; background: rgba(255,255,255,0.06); }
        .icon-btn img { width: 14px; height: 14px; filter: invert(1); }

        /* ── Search ───────────────────────────────────────────────────────── */
        .search-container {
          flex: 1;
          display: flex;
          align-items: center;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 6px;
          padding: 0 6px;
          height: 28px;
          gap: 4px;
        }
        .search-input {
          flex: 1;
          background: none;
          border: none;
          color: rgb(226, 226, 233);
          font-size: 11px;
          outline: none;
          padding: 0;
        }
        .search-input::placeholder { color: rgba(226,226,233,0.3); }

        /* ── Preset grid ──────────────────────────────────────────────────── */
        .presets-grid {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1px;
          overflow-y: auto;
          max-height: 180px;
          padding-right: 2px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.06) transparent;
        }
        .presets-grid::-webkit-scrollbar { width: 3px; }
        .presets-grid::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .preset-item {
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          color: rgba(226, 226, 233, 0.65);
          transition: all 120ms;
          text-align: left;
          background: none;
          border: none;
          width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .preset-item:hover {
          background: rgba(255,255,255,0.06);
          color: rgb(226, 226, 233);
        }
        .preset-item:active {
          background: rgba(77,138,240,0.12);
          color: rgb(77,138,240);
        }

        /* ── Empty / loading states ───────────────────────────────────────── */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 28px 16px;
          opacity: 0.3;
          text-align: center;
          font-size: 11px;
          gap: 8px;
        }
        .empty-state img { width: 36px; opacity: 0.5; filter: invert(1); }
        .loading-state {
          font-size: 11px;
          opacity: 0.35;
          text-align: center;
          padding: 20px 0;
        }
      `}</style>

      {/* ── Color space selectors (IDT / ODT) ── */}
      <div class="cs-selectors">
        <select
          class="cs-select"
          title="Input color space (IDT)"
          value={editState().inputColorSpace}
          onChange={(e) => handleCSChange("input", e.currentTarget.value)}
        >
          <For each={Object.entries(groupedInputCS())}>
            {([group, options]) => (
              <optgroup label={group}>
                <For each={options}>
                  {(opt) => <option value={opt.id}>{opt.label}</option>}
                </For>
              </optgroup>
            )}
          </For>
        </select>
        <select
          class="cs-select"
          title="Output color space (ODT)"
          value={editState().outputColorSpace}
          onChange={(e) => handleCSChange("output", e.currentTarget.value)}
        >
          <For each={Object.entries(groupedOutputCS())}>
            {([group, options]) => (
              <optgroup label={group}>
                <For each={options}>
                  {(opt) => <option value={opt.id}>{opt.label}</option>}
                </For>
              </optgroup>
            )}
          </For>
        </select>
      </div>

      {/* ── Pack strip / search toggle ── */}
      <div class="presets-header">
        <Show
          when={!isSearching()}
          fallback={
            <div class="search-container">
              <input
                class="search-input"
                placeholder="Search presets…"
                value={searchQuery()}
                onInput={(e) => setSearchQuery(e.currentTarget.value)}
                onKeyDown={(e) => e.key === "Escape" && exitSearch()}
                autofocus
              />
              <button
                class="icon-btn"
                onClick={exitSearch}
                title="Close search"
              >
                <img src="/assets/icons/revert_icon.svg" alt="close" />
              </button>
            </div>
          }
        >
          <div class="packs-scroll">
            <button
              class={`pack-btn ${currentPack() === ALL_PACKS_SENTINEL ? "active" : ""}`}
              onClick={() => setCurrentPack(ALL_PACKS_SENTINEL)}
            >
              All
            </button>
            <For each={PACKS.filter((p) => p.id !== "custom")}>
              {(pack) => (
                <button
                  class={`pack-btn ${currentPack() === pack.name ? "active" : ""}`}
                  onClick={() => setCurrentPack(pack.name)}
                >
                  {pack.name}
                </button>
              )}
            </For>
          </div>

          <button
            class="icon-btn"
            onClick={() => setIsSearching(true)}
            title="Search presets"
          >
            <img src="/assets/icons/magnifier_icon.svg" alt="search" />
          </button>
        </Show>

        <button class="icon-btn" onClick={handleLibrary} title="Preset library">
          <img src="/assets/icons/install_icon.svg" alt="library" />
        </button>
        <button class="icon-btn" onClick={handleGenerate} title="Generate preset variations">
          <img src="/assets/icons/sprinkle_icon.svg" alt="generate" />
        </button>
      </div>

      {/* ── Preset list ── */}
      <div class="presets-grid">
        <Show when={presets.loading}>
          <div class="loading-state">Loading presets…</div>
        </Show>

        <Show when={!presets.loading && filteredPresets().length === 0}>
          <div class="empty-state">
            <img src="/assets/icons/presets_icon.svg" alt="" />
            <span>
              {searchQuery()
                ? `No results for "${searchQuery()}"`
                : "No presets in this pack"}
            </span>
          </div>
        </Show>

        <For each={filteredPresets()}>
          {(preset) => (
            <button
              class="preset-item"
              onClick={() => handleApplyPreset(preset)}
              title={preset.name}
            >
              {preset.name}
            </button>
          )}
        </For>
      </div>
    </div>
  );
}
