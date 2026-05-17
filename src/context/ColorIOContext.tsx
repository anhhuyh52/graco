import {
  createContext,
  useContext,
  createSignal,
  createMemo,
  createEffect,
  type JSX,
  onCleanup,
  onMount,
} from "solid-js";
import {
  validateImageFile,
  validateImageDimensions,
} from "../core/media/imageValidation";
import { destroyWorkerClient, getWorkerClient } from "../workers/image-worker-client";
import { destroyExportWorkerClient, getExportWorkerClient } from "../workers/export-worker-client";
import { bakeCurveLut, createIdentityCurveLut } from "../core/curves/curveLut";
// ─── Types ────────────────────────────────────────────────────────────────────
export interface CurvePoint {
  x: number;
  y: number;
}

export interface Curve {
  points: CurvePoint[];
  interpolation: string;
  master: number;
  pointCount: number;
}

export interface EditState {
  inputColorSpace: string;
  outputColorSpace: string;
  balance: {
    exposure: number;
    saturation: number;
    temperature: number;
    tint: number;
    bypass: boolean;
  };
  exposure: {
    curve: Curve;
    bypass: boolean;
  };
  contrast: {
    curve: Curve;
    smartContrast: number;
    bypass: boolean;
  };
  scattering: {
    shadows: { x: number; y: number };
    highlights: { x: number; y: number };
    bypass: boolean;
  };
  refraction: {
    shadows: { x: number; y: number }[];
    highlights: { x: number; y: number }[];
    linked: boolean;
    threshold: number;
    bypass: boolean;
  };
  density: { curve: Curve; bypass: boolean };
  chroma: { curve: Curve; bypass: boolean };
  radiance: { curve: Curve; bypass: boolean };
  saturation: { curve: Curve; bypass: boolean };
  rgb: {
    shadowR: number;
    shadowG: number;
    shadowB: number;
    highlightR: number;
    highlightG: number;
    highlightB: number;
    shadowLinked: boolean;
    highlightLinked: boolean;
    bypass: boolean;
  };
  spotlight: {
    amount: number;
    pop: number;
    bias: number;
    focus: number;
    centerX: number;
    centerY: number;
    bypass: boolean;
  };
  halation: {
    amount: number;
    lightSpill: number;
    colorShift: number;
    saturation: number;
    bypass: boolean;
  };
  diffusion: {
    amount: number;
    fog: number;
    threshold: number;
    focus: number;
    focusX: number;
    focusY: number;
    bypass: boolean;
  };
  texture: {
    grainAmount: number;
    grainChroma: number;
    acutance: number;
    resolution: number;
    bypass: boolean;
  };
  match: {
    referenceIndex: number | null;
    color: number;
    tone: number;
    bypass: boolean;
  };
}

export interface ImageItem {
  id: string;
  name: string;
  width: number;
  height: number;
  bitmap: ImageBitmap | null;
  thumbnailURL: string;
  format: string;
  sourceFile?: File;
  sourceSize: number;
  lastModified: number;
}

export interface MediaItem {
  id: string;
  name: string;
  images: ImageItem[];
  activeImageId: string | null;
  editState: EditState;
  snapshots: Snapshot[];
}

export interface Project {
  id: string;
  name: string;
  userMedia: MediaItem[];
  activeUserMediaId: string | null;
}

export interface Snapshot {
  id: string;
  name: string;
  date: number;
  editState: EditState;
}

export interface UIState {
  activePanel: string;
  openPanels: Set<string>;
  overlay: string | null;
  viewMode: "single" | "split";
  zoom: "fit" | number;
  showScopes: boolean;
  scopeType: string;
  globalBypass: boolean;
  splitX: number;
}

export interface ToastMessage {
  id: string;
  msg: string;
  type: "success" | "error" | "info";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export const nanoid = (n = 12) =>
  Array.from(crypto.getRandomValues(new Uint8Array(n)))
    .map((b) => chars[b % chars.length])
    .join("");

const defaultCurve = (n = 5): Curve => ({
  points: Array.from({ length: n }, (_, i) => ({
    x: i / (n - 1),
    y: i / (n - 1),
  })),
  interpolation: "Cubic",
  master: 0,
  pointCount: n,
});

const curveFromPoints = (pts: number[][], interpolation = "Cubic"): Curve => ({
  points: pts.map(([x, y]) => ({ x, y })),
  interpolation,
  master: 0,
  pointCount: pts.length,
});

const DEFAULT_EXPOSURE_POINTS = [
  [0, 0.5],
  [0.333, 0.5],
  [0.667, 0.5],
  [1, 0.5],
];

const DEFAULT_CONTRAST_POINTS = [
  [0, 0],
  [0.167, 0.167],
  [0.333, 0.333],
  [0.833, 0.833],
  [1, 1],
];

const DEFAULT_HUE_CURVE_POINTS = [
  [0, 0.5],
  [0.167, 0.5],
  [0.333, 0.5],
  [0.583, 0.5],
  [0.805, 0.5],
  [1, 0.5],
];

const DEFAULT_CHROMA_POINTS = [
  [0, 0.5],
  [0.333, 0.5],
  [0.667, 0.5],
  [1, 0.5],
];

const DEFAULT_SATURATION_POINTS = [
  [0, 0.5],
  [0.25, 0.5],
  [0.5, 0.5],
  [0.75, 0.5],
  [1, 0.5],
];

export const createDefaultEditState = (): EditState => ({
  inputColorSpace: "sRGB",
  outputColorSpace: "sRGB",
  balance: {
    exposure: 0,
    saturation: 0,
    temperature: 0,
    tint: 0,
    bypass: false,
  },
  exposure: {
    curve: curveFromPoints(DEFAULT_EXPOSURE_POINTS, "cubic"),
    bypass: false,
  },
  contrast: {
    curve: curveFromPoints(DEFAULT_CONTRAST_POINTS, "cubic"),
    smartContrast: 0,
    bypass: false,
  },
  scattering: {
    shadows: { x: 0, y: 0 },
    highlights: { x: 0, y: 0 },
    bypass: false,
  },
  refraction: {
    shadows: Array.from({ length: 6 }, () => ({ x: 0, y: 0 })),
    highlights: Array.from({ length: 6 }, () => ({ x: 0, y: 0 })),
    linked: true,
    threshold: 0.5,
    bypass: false,
  },
  density: {
    curve: curveFromPoints(DEFAULT_HUE_CURVE_POINTS, "Bezier"),
    bypass: false,
  },
  chroma: {
    curve: curveFromPoints(DEFAULT_CHROMA_POINTS, "Cubic"),
    bypass: false,
  },
  radiance: {
    curve: curveFromPoints(DEFAULT_HUE_CURVE_POINTS, "Bezier"),
    bypass: false,
  },
  saturation: {
    curve: curveFromPoints(DEFAULT_SATURATION_POINTS, "Bezier"),
    bypass: false,
  },
  rgb: {
    shadowR: 0,
    shadowG: 0,
    shadowB: 0,
    highlightR: 0,
    highlightG: 0,
    highlightB: 0,
    shadowLinked: true,
    highlightLinked: true,
    bypass: false,
  },
  spotlight: {
    amount: 0,
    pop: 0,
    bias: 0,
    focus: 0.5,
    centerX: 0.5,
    centerY: 0.5,
    bypass: false,
  },
  halation: {
    amount: 0,
    lightSpill: 0,
    colorShift: 0,
    saturation: 1,
    bypass: false,
  },
  diffusion: {
    amount: 0,
    fog: 0,
    threshold: 1,
    focus: 0,
    focusX: 0.5,
    focusY: 0.5,
    bypass: false,
  },
  texture: {
    grainAmount: 0,
    grainChroma: 0,
    acutance: 0,
    resolution: 0,
    bypass: false,
  },
  match: { referenceIndex: null, color: 1, tone: 1, bypass: false },
});

// ─── Context Type ─────────────────────────────────────────────────────────────
interface ColorIOContextType {
  // State
  projects: () => Project[];
  activeProjectId: () => string | null;
  activeProject: () => Project | null;
  activeMedia: () => MediaItem | null;
  activeImage: () => ImageItem | null;
  editState: () => EditState;
  canUndo: () => boolean;
  canRedo: () => boolean;
  ui: () => UIState;
  toasts: () => ToastMessage[];
  isProcessing: () => boolean;

  // Actions
  createProject: (name: string) => void;
  setActiveProject: (id: string) => void;
  deleteProject: (id: string) => void;
  importImages: (files: File[]) => Promise<void>;
  setActiveImage: (id: string) => void;
  removeImage: (id: string) => void;
  setEdit: (
    updater: (state: EditState) => void,
    label?: string,
    commit?: boolean,
  ) => void;
  previewEdit: (updater: ((state: EditState) => void) | null) => void;
  resetPanel: (panel: keyof EditState) => void;
  resetAll: () => void;
  undo: () => void;
  redo: () => void;
  saveSnapshot: (name: string) => void;
  applySnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => void;
  setUI: <K extends keyof UIState>(key: K, value: UIState[K]) => void;
  togglePanel: (id: string) => void;
  setOverlay: (name: string | null) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
  exportCurrentImage: (format: "png" | "jpg") => Promise<void>;
  exportCurrentLut: () => Promise<void>;
  exportProject: () => Promise<void>;

  // Renderer
  initRenderer: (container: HTMLDivElement) => void;
  renderer: () => any;
  setRendererUniform: (key: string, value: any) => void;
  loadBitmap: (bitmap: ImageBitmap | null) => void;
  applyEditToRenderer: () => void;
  onHistogram: (callback: (data: Uint32Array) => void) => () => void;
}

const ColorIOContext = createContext<ColorIOContextType>();

export function useColorIO() {
  const ctx = useContext(ColorIOContext);
  if (!ctx) throw new Error("useColorIO must be used within ColorIOProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
import { Renderer } from "../lib/renderer";
import type { Renderer as RendererType } from "../lib/renderer";

// ── Curve LUT uniform mapping ─────────────────────────────────────────────────
const CURVE_LUT_MAP = [
  { key: 'exposure', uniform: 'uLutExposure' },
  { key: 'contrast', uniform: 'uLutContrast' },
  { key: 'density', uniform: 'uLutDensity' },
  { key: 'chroma', uniform: 'uLutChroma' },
  { key: 'radiance', uniform: 'uLutRadiance' },
  { key: 'saturation', uniform: 'uLutSaturation' },
] as const;

const IDENTITY_CURVE_LUT = createIdentityCurveLut();

/**
 * Synchronously bake all active curve LUTs and upload to the renderer.
 * Fast enough for main thread (~0.1ms for 6 curves × 256 samples).
 * Called on every edit for instant curve response.
 */
function syncCurveLuts(es: EditState, r: RendererType): void {
  for (const { key, uniform } of CURVE_LUT_MAP) {
    const section = es[key as keyof EditState] as any;
    if (section && 'curve' in section && !section.bypass) {
      r.setLUT(uniform, bakeCurveLut(section.curve));
    } else {
      r.setLUT(uniform, IDENTITY_CURVE_LUT);
    }
  }
}

export function ColorIOProvider(props: { children: JSX.Element }) {
  let lutRequestVersion = 0;
  let histogramRequestVersion = 0;
  let histogramInFlight = false;
  const pendingToastTimers = new Set<number>();

  // Core state
  const [projects, setProjects] = createSignal<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = createSignal<string | null>(
    null,
  );
  const [toasts, setToasts] = createSignal<ToastMessage[]>([]);
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [renderer, setRenderer] = createSignal<Renderer | null>(null);

  // UI State
  const [ui, setUiState] = createSignal<UIState>({
    activePanel: "match",
    openPanels: new Set(["match"]),
    overlay: null,
    viewMode: "single",
    zoom: "fit",
    showScopes: false,
    scopeType: "histogram",
    globalBypass: false,
    splitX: 0.5,
  });

  // History
  const [history, setHistory] = createSignal<
    { editState: EditState; label: string }[]
  >([{ editState: createDefaultEditState(), label: "Initial" }]);
  const [historyIndex, setHistoryIndex] = createSignal(0);

  // ─── Derived state ──────────────────────────────────────────────────────────
  const activeProject = createMemo(
    () => projects().find((p) => p.id === activeProjectId()) ?? null,
  );

  const activeMedia = createMemo(() => {
    const p = activeProject();
    if (!p || !p.activeUserMediaId) return null;
    return p.userMedia.find((m) => m.id === p.activeUserMediaId) ?? null;
  });

  const activeImage = createMemo(() => {
    const m = activeMedia();
    if (!m || !m.activeImageId) return null;
    return m.images.find((i) => i.id === m.activeImageId) ?? null;
  });

  const [liveEditState, setLiveEditState] = createSignal<EditState>(
    createDefaultEditState(),
  );

  const editState = createMemo(() => {
    const media = activeMedia();
    return media ? liveEditState() : createDefaultEditState();
  });

  // Sync liveEditState when activeMedia changes
  createEffect(() => {
    const media = activeMedia();
    if (media) {
      setLiveEditState(structuredClone(media.editState));
    }
  });

  const canUndo = createMemo(() => historyIndex() > 0);
  const canRedo = createMemo(() => historyIndex() < history().length - 1);

  const disposeImage = (image: ImageItem | null | undefined) => {
    if (!image) return;
    image.bitmap?.close();
    if (image.thumbnailURL) URL.revokeObjectURL(image.thumbnailURL);
  };

  const disposeProject = (project: Project | null | undefined) => {
    project?.userMedia.forEach((media) => media.images.forEach(disposeImage));
  };

  const makeDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    queueMicrotask(() => URL.revokeObjectURL(url));
  };

  const safeFileBaseName = (name: string) =>
    name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9._-]+/gi, "_") || "grade";

  const updateActiveMedia = (updater: (m: MediaItem) => MediaItem) => {
    const pId = activeProjectId();
    const mId = activeMedia()?.id;
    if (!pId || !mId) return;
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== pId) return p;
        return {
          ...p,
          userMedia: p.userMedia.map((m) => {
            if (m.id !== mId) return m;
            return updater(m);
          }),
        };
      }),
    );
  };

  // ─── Actions ────────────────────────────────────────────────────────────────
  const createProject = (name: string) => {
    const media: MediaItem = {
      id: nanoid(),
      name: "Untitled",
      images: [],
      activeImageId: null,
      editState: createDefaultEditState(),
      snapshots: [],
    };
    const project: Project = {
      id: nanoid(),
      name,
      userMedia: [media],
      activeUserMediaId: media.id,
    };
    setProjects((prev) => [...prev, project]);
    setActiveProjectId(project.id);
    setUiState((prev) => ({ ...prev, overlay: null }));
  };

  const setActiveProject = (id: string) => {
    const nextProject = projects().find((p) => p.id === id) ?? null;
    const nextMedia = nextProject?.userMedia.find((m) => m.id === nextProject.activeUserMediaId);
    const nextImage = nextMedia?.images.find((i) => i.id === nextMedia.activeImageId);
    setActiveProjectId(id);
    queueMicrotask(() => {
      loadBitmap(nextImage?.bitmap ?? null);
      applyEditToRenderer();
    });
  };

  const deleteProject = (id: string) => {
    const projectToDelete = projects().find((p) => p.id === id);
    const deletingActiveProject = activeProjectId() === id;
    if (deletingActiveProject) {
      loadBitmap(null);
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
    disposeProject(projectToDelete);
    if (deletingActiveProject) {
      const remaining = projects().filter((p) => p.id !== id);
      setActiveProjectId(remaining[0]?.id ?? null);
      const nextProject = remaining[0];
      const nextMedia = nextProject?.userMedia.find((m) => m.id === nextProject.activeUserMediaId);
      const nextImage = nextMedia?.images.find((i) => i.id === nextMedia.activeImageId);
      queueMicrotask(() => loadBitmap(nextImage?.bitmap ?? null));
    }
  };

  const importImages = async (files: File[]) => {
    let currentProjectId = activeProjectId();
    let currentMediaId = activeMedia()?.id;

    if (!currentProjectId || !currentMediaId) {
      const media: MediaItem = {
        id: nanoid(),
        name: "Untitled",
        images: [],
        activeImageId: null,
        editState: createDefaultEditState(),
        snapshots: [],
      };
      const project: Project = {
        id: nanoid(),
        name: "Untitled Project",
        userMedia: [media],
        activeUserMediaId: media.id,
      };
      setProjects((prev) => [...prev, project]);
      setActiveProjectId(project.id);
      currentProjectId = project.id;
      currentMediaId = media.id;
      setUiState((prev) => ({ ...prev, overlay: null }));
    }

    setIsProcessing(true);

    const newImages: ImageItem[] = [];
    for (const file of files) {
      try {
        const fileValidation = validateImageFile(file);
        if (!fileValidation.valid) {
          showToast(`Skipped ${file.name}: ${fileValidation.error}`, "error");
          continue;
        }

        const bitmap = await createImageBitmap(file, {
          imageOrientation: "from-image",
          premultiplyAlpha: "none",
          colorSpaceConversion: "default",
        });

        const dimValidation = validateImageDimensions(
          bitmap.width,
          bitmap.height,
        );
        if (!dimValidation.valid) {
          bitmap.close();
          showToast(`Skipped ${file.name}: ${dimValidation.error}`, "error");
          continue;
        }

        newImages.push({
          id: nanoid(),
          name: file.name,
          width: bitmap.width,
          height: bitmap.height,
          bitmap,
          thumbnailURL: URL.createObjectURL(file),
          format: file.type,
          sourceFile: file,
          sourceSize: file.size,
          lastModified: file.lastModified,
        });
      } catch (e) {
        console.error("Bitmap decode error:", e);
        showToast(
          `Failed to process: ${file.name} (Corrupted or unsupported)`,
          "error",
        );
      }
    }

    setIsProcessing(false);
    if (newImages.length === 0) return;

    let firstNewId = newImages[0].id;
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== currentProjectId) return p;
        return {
          ...p,
          userMedia: p.userMedia.map((m) => {
            if (m.id !== currentMediaId) return m;
            const merged = [...m.images, ...newImages];
            const activeId = m.activeImageId ?? firstNewId;
            firstNewId = activeId;
            return { ...m, images: merged, activeImageId: activeId };
          }),
        };
      }),
    );

    queueMicrotask(() => {
      const bitmap = newImages.find((i) => i.id === firstNewId)?.bitmap ?? null;
      loadBitmap(bitmap);
    });
  };

  const setActiveImage = (id: string) => {
    const projectId = activeProjectId();
    const mediaId = activeMedia()?.id;
    if (!projectId || !mediaId) return;

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          userMedia: p.userMedia.map((m) => {
            if (m.id !== mediaId) return m;
            return { ...m, activeImageId: id };
          }),
        };
      }),
    );

    queueMicrotask(() => {
      const img = activeMedia()?.images.find((i) => i.id === id);
      loadBitmap(img?.bitmap ?? null);
    });
  };

  // FIX: was mutating media.images / media.activeImageId directly
  const removeImage = (id: string) => {
    const media = activeMedia();
    if (!media) return;

    const images = media.images.filter((i) => i.id !== id);
    const removedImage = media.images.find((i) => i.id === id);
    const activeImageId =
      media.activeImageId === id
        ? (images[0]?.id ?? null)
        : media.activeImageId;

    updateActiveMedia((m) => ({ ...m, images, activeImageId }));

    // Load the newly-active image's bitmap if the active image was removed
    if (media.activeImageId === id) {
      queueMicrotask(() => {
        const img = images.find((i) => i.id === activeImageId);
        loadBitmap(img?.bitmap ?? null);
        disposeImage(removedImage);
      });
    } else {
      disposeImage(removedImage);
    }
  };

  // FIX: was mutating media.editState in place — SolidJS memos never fired.
  // Now: clone → apply updater → immutable project update → GPU push.
  const setEdit = (
    updater: (state: EditState) => void,
    label = "Edit",
    commit = true,
  ) => {
    const media = activeMedia();
    if (!media) {
      createProject("Untitled Project");
      queueMicrotask(() => setEdit(updater, label, commit));
      return;
    }

    // Update live state immediately for UI responsiveness
    const next = structuredClone(liveEditState());
    updater(next);
    setLiveEditState(next);

    // Push to renderer immediately — uniforms + curve LUTs
    const r = renderer();
    if (r) {
      lutRequestVersion += 1;
      r.applyEditState(next, ui().globalBypass);
      syncCurveLuts(next, r);
    }

    if (commit) {
      // Truncate redo future, append, cap at 100
      const newHistory = history().slice(0, historyIndex() + 1);
      newHistory.push({ editState: structuredClone(next), label });
      if (newHistory.length > 100) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      // Persist to project state
      updateActiveMedia((m) => ({ ...m, editState: next }));
    }
  };

  // Zero-lag, history-free preview for hover states
  const previewEdit = (updater: ((state: EditState) => void) | null) => {
    const r = renderer();
    if (!r) return;
    if (updater === null) {
      lutRequestVersion += 1;
      const es = editState();
      r.applyEditState(es, ui().globalBypass);
      syncCurveLuts(es, r);
      return;
    }
    const next = structuredClone(editState());
    updater(next);
    lutRequestVersion += 1;
    r.applyEditState(next, ui().globalBypass);
    syncCurveLuts(next, r);
  };

  const resetPanel = (panel: keyof EditState) => {
    const defaults = createDefaultEditState();
    setEdit((s) => {
      (s as any)[panel] = structuredClone((defaults as any)[panel]);
    }, `Reset ${panel}`);
  };

  const resetAll = () => {
    const defaults = createDefaultEditState();
    setEdit((s) => {
      Object.assign(s, structuredClone(defaults));
    }, "Reset All");
  };

  // FIX: was mutating media.editState directly
  const undo = () => {
    if (!canUndo()) return;
    const newIndex = historyIndex() - 1;
    setHistoryIndex(newIndex);
    const restored = structuredClone(history()[newIndex].editState);
    setLiveEditState(restored);
    updateActiveMedia((m) => ({ ...m, editState: restored }));
    const r1 = renderer();
    if (r1) { r1.applyEditState(restored, ui().globalBypass); syncCurveLuts(restored, r1); }
  };

  // FIX: same as undo
  const redo = () => {
    if (!canRedo()) return;
    const newIndex = historyIndex() + 1;
    setHistoryIndex(newIndex);
    const restored = structuredClone(history()[newIndex].editState);
    setLiveEditState(restored);
    updateActiveMedia((m) => ({ ...m, editState: restored }));
    const r2 = renderer();
    if (r2) { r2.applyEditState(restored, ui().globalBypass); syncCurveLuts(restored, r2); }
  };

  // FIX: was calling media.snapshots.push() — direct array mutation
  const saveSnapshot = (name: string) => {
    const media = activeMedia();
    if (!media) return;
    const snap: Snapshot = {
      id: nanoid(),
      name,
      date: Date.now(),
      editState: structuredClone(media.editState),
    };
    updateActiveMedia((m) => ({ ...m, snapshots: [...m.snapshots, snap] }));
  };

  // FIX: was mutating media.editState directly
  const applySnapshot = (id: string) => {
    const media = activeMedia();
    if (!media) return;
    const snap = media.snapshots.find((s) => s.id === id);
    if (!snap) return;
    const restored = structuredClone(snap.editState);
    setLiveEditState(restored);
    updateActiveMedia((m) => ({ ...m, editState: restored }));
    const r3 = renderer();
    if (r3) { r3.applyEditState(restored, ui().globalBypass); syncCurveLuts(restored, r3); }
  };

  // FIX: was mutating media.snapshots directly
  const deleteSnapshot = (id: string) => {
    updateActiveMedia((m) => ({
      ...m,
      snapshots: m.snapshots.filter((s) => s.id !== id),
    }));
  };

  const setUI = <K extends keyof UIState>(key: K, value: UIState[K]) => {
    setUiState((prev) => ({ ...prev, [key]: value }));
    if (key === "viewMode" && renderer()) {
      renderer()!.setSplit(value === "split", ui().splitX);
    }
    if (key === "splitX" && renderer()) {
      renderer()!.setSplit(ui().viewMode === "split", value as number);
    }
    if (key === "globalBypass" && renderer()) {
      renderer()!.setUniform("uBypass", value ? 1 : 0);
    }
  };

  const togglePanel = (id: string) => {
    setUiState((prev) => {
      const newOpen = new Set(prev.openPanels);
      newOpen.has(id) ? newOpen.delete(id) : newOpen.add(id);
      return { ...prev, openPanels: newOpen };
    });
  };

  const setOverlay = (name: string | null) => {
    setUiState((prev) => ({ ...prev, overlay: name }));
  };

  const showToast = (
    msg: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    const id = nanoid();
    setToasts((prev) => [...prev, { id, msg, type }]);
    const timer = window.setTimeout(() => {
      pendingToastTimers.delete(timer);
      removeToast(id);
    }, 4000);
    pendingToastTimers.add(timer);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ─── Renderer ───────────────────────────────────────────────────────────────
  const initRenderer = (container: HTMLDivElement) => {
    if (renderer()) return;
    const r = new Renderer(container);

    r.onHistogramPixels(async (buffer) => {
      if (!ui().showScopes || histogramInFlight) return;
      const requestVersion = ++histogramRequestVersion;
      histogramInFlight = true;
      try {
        const bins = await getWorkerClient().gradeHistogram(buffer, 128, 128);
        if (requestVersion !== histogramRequestVersion || !ui().showScopes) return;
        histogramCallbacks().forEach((cb) => cb(bins));
      } catch (e) {
        console.error("Histogram error:", e);
      } finally {
        if (requestVersion === histogramRequestVersion) {
          histogramInFlight = false;
        }
      }
    });

    setRenderer(r);
    applyEditToRenderer();
  };

  const [histogramCallbacks, setHistogramCallbacks] = createSignal<
    ((data: Uint32Array) => void)[]
  >([]);

  const onHistogram = (callback: (data: Uint32Array) => void) => {
    setHistogramCallbacks((prev) => [...prev, callback]);
    return () => {
      setHistogramCallbacks((prev) => prev.filter((cb) => cb !== callback));
    };
  };

  const setRendererUniform = (key: string, value: any) => {
    renderer()?.setUniform(key, value);
  };

  const loadBitmap = (bitmap: ImageBitmap | null) => {
    renderer()?.loadBitmap(bitmap);
  };

  const applyEditToRenderer = async () => {
    const r = renderer();
    if (!r) return;
    const es = editState();

    // Fast path: update uniforms + sync LUTs instantly
    const requestVersion = ++lutRequestVersion;
    r.applyEditState(es, ui().globalBypass);
    syncCurveLuts(es, r);

    // Offload heavy curve evaluation to worker
    const curves = {
      exposure: es.exposure.bypass ? undefined : es.exposure.curve,
      contrast: es.contrast.bypass ? undefined : es.contrast.curve,
      density: es.density.bypass ? undefined : es.density.curve,
      chroma: es.chroma.bypass ? undefined : es.chroma.curve,
      radiance: es.radiance.bypass ? undefined : es.radiance.curve,
      saturation: es.saturation.bypass ? undefined : es.saturation.curve,
    };

    try {
      const luts = await getWorkerClient().generateCurveLuts(curves);
      if (requestVersion !== lutRequestVersion || renderer() !== r) return;
      if (luts.exposure) r.setLUT("uLutExposure", luts.exposure);
      if (luts.contrast) r.setLUT("uLutContrast", luts.contrast);
      if (luts.density) r.setLUT("uLutDensity", luts.density);
      if (luts.chroma) r.setLUT("uLutChroma", luts.chroma);
      if (luts.radiance) r.setLUT("uLutRadiance", luts.radiance);
      if (luts.saturation) r.setLUT("uLutSaturation", luts.saturation);
    } catch (e) {
      console.error("LUT generation error:", e);
    }
  };

  const exportCurrentImage = async (format: "png" | "jpg") => {
    const r = renderer();
    const image = activeImage();
    if (!r || !image) {
      showToast("No rendered image to export", "error");
      return;
    }

    try {
      showToast("Exporting image...", "info");
      const mimeType = format === "png" ? "image/png" : "image/jpeg";
      const blob = await r.exportCanvasBlob(mimeType, format === "jpg" ? 0.92 : undefined);
      makeDownload(blob, `${safeFileBaseName(image.name)}-graded.${format === "png" ? "png" : "jpg"}`);
      showToast("Image export complete", "success");
    } catch (error) {
      console.error("Image export error:", error);
      showToast("Image export failed", "error");
    }
  };

  const exportCurrentLut = async () => {
    const media = activeMedia();
    if (!media) {
      showToast("No grade to export", "error");
      return;
    }

    try {
      const es = editState();
      const curve = es.contrast.bypass ? createDefaultEditState().contrast.curve : es.contrast.curve;
      const cube = await getExportWorkerClient().encodeLut1D("ColorIO SDR Contrast Curve", curve);
      makeDownload(new Blob([cube], { type: "application/octet-stream" }), `${safeFileBaseName(media.name)}-contrast.cube`);
      showToast("LUT export complete", "success");
    } catch (error) {
      console.error("LUT export error:", error);
      showToast("LUT export failed", "error");
    }
  };

  const exportProject = async () => {
    const project = activeProject();
    if (!project) {
      showToast("No project to export", "error");
      return;
    }

    try {
      const serializableProject = {
        ...project,
        userMedia: project.userMedia.map((media) => ({
          ...media,
          images: media.images.map(({ bitmap, sourceFile, thumbnailURL, ...image }) => ({
            ...image,
            sourceName: sourceFile?.name,
            sourceType: sourceFile?.type,
          })),
        })),
      };

      const json = await getExportWorkerClient().encodeProjectJson(serializableProject);
      makeDownload(new Blob([json], { type: "application/json" }), `${safeFileBaseName(project.name)}.colorio.json`);
      showToast("Project export complete", "success");
    } catch (error) {
      console.error("Project export error:", error);
      showToast("Project export failed", "error");
    }
  };

  onCleanup(() => {
    renderer()?.destroy();
    destroyWorkerClient();
    destroyExportWorkerClient();
    projects().forEach(disposeProject);
    for (const timer of pendingToastTimers) window.clearTimeout(timer);
    pendingToastTimers.clear();
  });

  onMount(() => {
    if (!activeProjectId() || !activeMedia()) {
      createProject("Untitled Project");
    }

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (cmd && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      if (cmd && e.key === "e") {
        e.preventDefault();
        setOverlay("export");
      }
      if (cmd && e.key === "o") {
        e.preventDefault();
        setOverlay("projects");
      }
      if (cmd && e.key === "s") {
        e.preventDefault();
        saveSnapshot(`Snapshot ${new Date().toLocaleTimeString()}`);
        showToast("Snapshot saved", "success");
      }
      if (e.key === "Escape") {
        setOverlay(null);
      }
      if (e.key === "\\") {
        setUI("viewMode", ui().viewMode === "split" ? "single" : "split");
      }
    };

    const dropHandler = (e: DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer?.files || []).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (files.length) importImages(files);
    };

    const dragOverHandler = (e: DragEvent) => e.preventDefault();

    window.addEventListener("keydown", handler);
    window.addEventListener("drop", dropHandler);
    window.addEventListener("dragover", dragOverHandler);

    onCleanup(() => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("drop", dropHandler);
      window.removeEventListener("dragover", dragOverHandler);
    });
  });

  const value: ColorIOContextType = {
    projects,
    activeProjectId,
    activeProject,
    activeMedia,
    activeImage,
    editState,
    canUndo,
    canRedo,
    ui,
    toasts,
    isProcessing,
    createProject,
    setActiveProject,
    deleteProject,
    importImages,
    setActiveImage,
    removeImage,
    setEdit,
    previewEdit,
    resetPanel,
    resetAll,
    undo,
    redo,
    saveSnapshot,
    applySnapshot,
    deleteSnapshot,
    setUI,
    togglePanel,
    setOverlay,
    showToast,
    removeToast,
    exportCurrentImage,
    exportCurrentLut,
    exportProject,
    initRenderer,
    renderer,
    setRendererUniform,
    loadBitmap,
    applyEditToRenderer,
    onHistogram,
  };

  return (
    <ColorIOContext.Provider value={value}>
      {props.children}
    </ColorIOContext.Provider>
  );
}
