import {
  createContext,
  useContext,
  createSignal,
  createMemo,
  type JSX,
  onCleanup,
  onMount,
} from "solid-js";

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
  density: { curve: curveFromPoints(DEFAULT_HUE_CURVE_POINTS, "Bezier"), bypass: false },
  chroma: { curve: curveFromPoints(DEFAULT_CHROMA_POINTS, "Cubic"), bypass: false },
  radiance: { curve: curveFromPoints(DEFAULT_HUE_CURVE_POINTS, "Bezier"), bypass: false },
  saturation: { curve: curveFromPoints(DEFAULT_SATURATION_POINTS, "Bezier"), bypass: false },
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
  setEdit: (updater: (state: EditState) => void, label?: string) => void;
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

  // Renderer
  initRenderer: (container: HTMLDivElement) => void;
  renderer: () => any;
  setRendererUniform: (key: string, value: any) => void;
  loadBitmap: (bitmap: ImageBitmap | null) => void;
  applyEditToRenderer: () => void;
}

const ColorIOContext = createContext<ColorIOContextType>();

export function useColorIO() {
  const ctx = useContext(ColorIOContext);
  if (!ctx) throw new Error("useColorIO must be used within ColorIOProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
import { Renderer } from "../lib/renderer";

export function ColorIOProvider(props: { children: JSX.Element }) {
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

  const editState = createMemo(
    () => activeMedia()?.editState ?? createDefaultEditState(),
  );
  const canUndo = createMemo(() => historyIndex() > 0);
  const canRedo = createMemo(() => historyIndex() < history().length - 1);

  // ─── CORE HELPER: immutable media update ─────────────────────────────────────
  // FIX: All mutation functions previously mutated objects in-place then called
  // setProjects(prev => [...prev]). Because the project/media object references
  // stayed the same, activeProject / activeMedia / editState memos never fired —
  // the UI would not update on undo, redo, snapshot apply, etc.
  // This helper always produces new object references all the way down the chain
  // so SolidJS memos can detect the change.
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
    setActiveProjectId(id);
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeProjectId() === id) {
      const remaining = projects().filter((p) => p.id !== id);
      setActiveProjectId(remaining[0]?.id ?? null);
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
        const bitmap = await createImageBitmap(file, {
          imageOrientation: "from-image",
          premultiplyAlpha: "none",
          colorSpaceConversion: "default",
        });
        newImages.push({
          id: nanoid(),
          name: file.name,
          width: bitmap.width,
          height: bitmap.height,
          bitmap,
          thumbnailURL: URL.createObjectURL(file),
          format: file.type,
        });
      } catch {
        showToast(`Failed: ${file.name}`, "error");
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
      });
    }
  };

  // FIX: was mutating media.editState in place — SolidJS memos never fired.
  // Now: clone → apply updater → immutable project update → GPU push.
  const setEdit = (updater: (state: EditState) => void, label = "Edit") => {
    const media = activeMedia();
    if (!media) {
      createProject("Untitled Project");
      queueMicrotask(() => setEdit(updater, label));
      return;
    }

    // Clone first so the updater mutates a fresh object, not the live state
    const next = structuredClone(media.editState);
    updater(next);

    // Truncate redo future, append, cap at 100
    const newHistory = history().slice(0, historyIndex() + 1);
    newHistory.push({ editState: structuredClone(next), label });
    if (newHistory.length > 100) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    // Immutable update so activeMedia / editState memos fire
    updateActiveMedia((m) => ({ ...m, editState: next }));

    // Push directly — don't rely on memo timing for the GPU path
    renderer()?.applyEditState(next, ui().globalBypass);
  };

  const resetPanel = (panel: keyof EditState) => {
    const defaults = createDefaultEditState();
    setEdit((s) => {
      (s as any)[panel] = (defaults as any)[panel];
    }, `Reset ${panel}`);
  };

  // FIX: was mutating media.editState and then spreading the array
  const resetAll = () => {
    const defaults = createDefaultEditState();
    updateActiveMedia((m) => ({ ...m, editState: defaults }));
    renderer()?.applyEditState(defaults, ui().globalBypass);
  };

  // FIX: was mutating media.editState directly
  const undo = () => {
    if (!canUndo()) return;
    const newIndex = historyIndex() - 1;
    setHistoryIndex(newIndex);
    const restored = structuredClone(history()[newIndex].editState);
    updateActiveMedia((m) => ({ ...m, editState: restored }));
    renderer()?.applyEditState(restored, ui().globalBypass);
  };

  // FIX: same as undo
  const redo = () => {
    if (!canRedo()) return;
    const newIndex = historyIndex() + 1;
    setHistoryIndex(newIndex);
    const restored = structuredClone(history()[newIndex].editState);
    updateActiveMedia((m) => ({ ...m, editState: restored }));
    renderer()?.applyEditState(restored, ui().globalBypass);
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
    updateActiveMedia((m) => ({ ...m, editState: restored }));
    renderer()?.applyEditState(restored, ui().globalBypass);
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
    setTimeout(() => removeToast(id), 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ─── Renderer ───────────────────────────────────────────────────────────────
  const initRenderer = (container: HTMLDivElement) => {
    if (renderer()) return;
    const r = new Renderer(container);
    setRenderer(r);
    // Apply current state immediately after creation
    applyEditToRenderer();
  };

  const setRendererUniform = (key: string, value: any) => {
    renderer()?.setUniform(key, value);
  };

  const loadBitmap = (bitmap: ImageBitmap | null) => {
    renderer()?.loadBitmap(bitmap);
  };

  const applyEditToRenderer = () => {
    const r = renderer();
    if (!r) return;
    r.applyEditState(editState(), ui().globalBypass);
  };

  // FIX: renderer was never destroyed on unmount → rAF loop and GPU resources leaked
  onCleanup(() => {
    renderer()?.destroy();
  });

  // ─── Keyboard shortcuts ─────────────────────────────────────────────────────
  onMount(() => {
    // Keep controls interactive even before importing any image by ensuring
    // there is always an active project/media target for setEdit().
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
    initRenderer,
    renderer,
    setRendererUniform,
    loadBitmap,
    applyEditToRenderer,
  };

  return (
    <ColorIOContext.Provider value={value}>
      {props.children}
    </ColorIOContext.Provider>
  );
}
