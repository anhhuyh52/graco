/**
 * image-worker-client.ts
 *
 * Main-thread typed RPC client for the image processing worker.
 * Provides promise-based methods with request/response correlation via IDs.
 *
 * Usage:
 *   import { getWorkerClient } from '../workers/image-worker-client';
 *   const result = await getWorkerClient().decode(buffer);
 */

import type {
  AnyWorkerResponse,
  CurveDef,
  WorkerErrorPayload,
} from './worker-protocol';

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: Error) => void;
  abort?: () => void;
}

interface SendOptions {
  signal?: AbortSignal;
}

function workerErrorToError(error: WorkerErrorPayload): Error {
  const result = new Error(error.message);
  result.name = error.name ?? "WorkerError";
  if (error.stack) result.stack = error.stack;
  return result;
}

class ImageWorkerClient {
  #worker: Worker;
  #nextId = 1;
  #pending = new Map<number, PendingRequest>();

  constructor() {
    this.#worker = new Worker(
      new URL('./image.worker.ts', import.meta.url),
      { type: 'module' },
    );

    this.#worker.onmessage = (e: MessageEvent<AnyWorkerResponse>) => {
      const { id, error, ...rest } = e.data;
      const pending = this.#pending.get(id);
      if (!pending) return;
      this.#pending.delete(id);

      pending.abort?.();

      if (error) {
        pending.reject(workerErrorToError(error));
      } else {
        pending.resolve(rest);
      }
    };

    this.#worker.onerror = (e) => {
      console.error('[ImageWorker] Unhandled error:', e.message);
      this.#rejectAll(new Error(e.message));
    };

    this.#worker.onmessageerror = () => {
      this.#rejectAll(new Error("Image worker message serialization failed"));
    };
  }

  #rejectAll(error: Error): void {
    for (const pending of this.#pending.values()) {
      pending.abort?.();
      pending.reject(error);
    }
    this.#pending.clear();
  }

  /**
   * Send a typed message to the worker and return a correlated promise.
   * Transferable buffers are detached from the main thread for zero-copy.
   */
  #send<T>(
    message: Record<string, any>,
    transfer: Transferable[] = [],
    options: SendOptions = {},
  ): Promise<T> {
    const id = this.#nextId++;
    if (options.signal?.aborted) {
      return Promise.reject(new DOMException("Worker request aborted", "AbortError"));
    }

    return new Promise<T>((resolve, reject) => {
      const abort = () => {
        this.#pending.delete(id);
        this.#worker.postMessage({
          id: this.#nextId++,
          type: "cancel",
          targetId: id,
        });
        reject(new DOMException("Worker request aborted", "AbortError"));
      };

      if (options.signal) {
        options.signal.addEventListener("abort", abort, { once: true });
      }

      this.#pending.set(id, {
        resolve,
        reject,
        abort: options.signal
          ? () => options.signal?.removeEventListener("abort", abort)
          : undefined,
      });
      this.#worker.postMessage({ ...message, id }, transfer);
    });
  }

  /**
   * Decode an image file buffer into RGBA pixel data.
   * The buffer is transferred (zero-copy) to the worker.
   *
   * @returns { image: { width, height, pixels: ArrayBuffer, format: string } }
   */
  async decode(buffer: ArrayBuffer, options: SendOptions = {}): Promise<{
    image: { width: number; height: number; pixels: ArrayBuffer; format: string };
  }> {
    const response = await this.#send<{
      image?: { width: number; height: number; pixels: ArrayBuffer; format: string };
    }>({ type: 'decode', buffer }, [buffer], options);
    if (!response.image) throw new Error("Image worker decode response did not include image data");
    return { image: response.image };
  }

  /**
   * Compute RGB histogram bins from graded pixel data.
   * Receives a 128×128×4 RGBA buffer from GPU readback.
   *
   * @returns Uint32Array[768] — 256 bins per R, G, B channel
   */
  async gradeHistogram(
    pixelBuffer: ArrayBuffer,
    width: number,
    height: number,
    options: SendOptions = {},
  ): Promise<Uint32Array> {
    const response = await this.#send<{ bins: ArrayBuffer }>(
      { type: 'histogram', pixels: pixelBuffer, width, height },
      [],
      options,
    );
    if (!response.bins) throw new Error("Image worker histogram response did not include bins");
    return new Uint32Array(response.bins);
  }

  /**
   * Generate baked LUT textures from curve definitions.
   * Each returned Uint8Array is 1024 bytes (256×4 RGBA).
   */
  async generateCurveLuts(
    curves: Record<string, CurveDef | undefined>,
    options: SendOptions = {},
  ): Promise<Record<string, Uint8Array>> {
    // Filter out undefined curves before sending
    const activeCurves: Record<string, CurveDef> = {};
    for (const [key, curve] of Object.entries(curves)) {
      if (curve) activeCurves[key] = curve;
    }

    const response = await this.#send<{ luts: Record<string, ArrayBuffer> }>(
      { type: 'generateLuts', curves: activeCurves },
      [],
      options,
    );
    if (!response.luts) throw new Error("Image worker LUT response did not include LUT data");

    // Convert transferred ArrayBuffers back to Uint8Arrays
    const result: Record<string, Uint8Array> = {};
    for (const [key, buffer] of Object.entries(response.luts)) {
      result[key] = new Uint8Array(buffer);
    }
    return result;
  }

  /** Terminate the worker. Call on app teardown. */
  destroy(): void {
    this.#worker.terminate();
    this.#rejectAll(new Error("Image worker destroyed"));
    this.#pending.clear();
  }
}

// ── Lazy singleton ───────────────────────────────────────────────────────────

let instance: ImageWorkerClient | null = null;

/**
 * Get the shared worker client instance.
 * The worker is created lazily on first call.
 */
export function getWorkerClient(): ImageWorkerClient {
  if (!instance) {
    instance = new ImageWorkerClient();
  }
  return instance;
}

export function destroyWorkerClient(): void {
  instance?.destroy();
  instance = null;
}
