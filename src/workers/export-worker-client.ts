import type { CurveLutDefinition } from "../core/curves/curveLut";

type ExportResponse = {
  id: number;
  type: "lut1d" | "projectJson";
  text?: string;
  error?: string;
};

class ExportWorkerClient {
  #worker = new Worker(new URL("./export.worker.ts", import.meta.url), {
    type: "module",
  });
  #nextId = 1;
  #pending = new Map<number, {
    resolve: (text: string) => void;
    reject: (error: Error) => void;
  }>();

  constructor() {
    this.#worker.onmessage = (event: MessageEvent<ExportResponse>) => {
      const pending = this.#pending.get(event.data.id);
      if (!pending) return;
      this.#pending.delete(event.data.id);

      if (event.data.error) {
        pending.reject(new Error(event.data.error));
      } else {
        pending.resolve(event.data.text ?? "");
      }
    };

    this.#worker.onerror = (event) => {
      const error = new Error(event.message);
      for (const pending of this.#pending.values()) pending.reject(error);
      this.#pending.clear();
    };
  }

  #send(message: Record<string, unknown>): Promise<string> {
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#worker.postMessage({ ...message, id });
    });
  }

  encodeLut1D(title: string, curve: CurveLutDefinition): Promise<string> {
    return this.#send({ type: "lut1d", title, curve });
  }

  encodeProjectJson(project: unknown): Promise<string> {
    return this.#send({ type: "projectJson", project });
  }

  destroy(): void {
    this.#worker.terminate();
    for (const pending of this.#pending.values()) {
      pending.reject(new Error("Export worker destroyed"));
    }
    this.#pending.clear();
  }
}

let instance: ExportWorkerClient | null = null;

export function getExportWorkerClient(): ExportWorkerClient {
  instance ??= new ExportWorkerClient();
  return instance;
}

export function destroyExportWorkerClient(): void {
  instance?.destroy();
  instance = null;
}
