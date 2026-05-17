/**
 * image.worker.ts
 *
 * Web Worker entry point for off-thread image processing.
 *
 * Handles:
 *   1. Image decode — ArrayBuffer → RGBA pixels via browser decode
 *   2. Histogram binning — RGBA pixels → 768-element bin array (256 per R/G/B)
 *   3. LUT generation — curve definitions → baked 256×1 RGBA texture data
 *
 * All heavy pixel/math work runs here, keeping the main thread free for
 * UI interaction and GPU rendering.
 */

import type {
  AnyWorkerRequest,
  CancelResponse,
  DecodeResponse,
  HistogramResponse,
  GenerateLutsResponse,
  WorkerErrorPayload,
} from './worker-protocol';
import { generateAllCurveLuts } from './lut-generator';

const canceledRequests = new Set<number>();

function serializeError(error: unknown): WorkerErrorPayload {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}

function postResponse(response: DecodeResponse | HistogramResponse | GenerateLutsResponse | CancelResponse, transfer: Transferable[] = []): void {
  (self as any).postMessage(response, transfer);
}

function isCanceled(id: number): boolean {
  return canceledRequests.has(id);
}

// ── Format detection from magic bytes ────────────────────────────────────────

function detectFormat(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer, 0, Math.min(12, buffer.byteLength));
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
  return 'image/unknown';
}

function formatToExtension(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/webp': 'WebP',
    'image/gif': 'GIF',
  };
  return map[mime] ?? 'Unknown';
}

// ── Decode handler ───────────────────────────────────────────────────────────

async function handleDecode(buffer: ArrayBuffer): Promise<{
  image: { width: number; height: number; pixels: ArrayBuffer; format: string };
  transfer: Transferable[];
}> {
  const mime = detectFormat(buffer);
  if (mime === 'image/unknown' || mime === 'image/gif') {
    throw new Error(`Unsupported browser decode format: ${mime}`);
  }
  const blob = new Blob([buffer], { type: mime });
  const bitmap = await createImageBitmap(blob);

  // Draw to OffscreenCanvas to extract RGBA pixels
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  bitmap.close();

  const pixels = imageData.data.buffer;

  return {
    image: {
      width: imageData.width,
      height: imageData.height,
      pixels,
      format: formatToExtension(mime),
    },
    transfer: [pixels],
  };
}

// ── Histogram handler ────────────────────────────────────────────────────────

function handleHistogram(
  pixelBuffer: ArrayBuffer,
  width: number,
  height: number,
): { bins: ArrayBuffer; transfer: Transferable[] } {
  const pixels = new Uint8Array(pixelBuffer);
  const bins = new Uint32Array(768); // 256 R + 256 G + 256 B
  const total = width * height;

  for (let i = 0; i < total; i++) {
    const off = i * 4;
    bins[pixels[off]]++;             // R channel → bins[0..255]
    bins[256 + pixels[off + 1]]++;   // G channel → bins[256..511]
    bins[512 + pixels[off + 2]]++;   // B channel → bins[512..767]
  }

  const buffer = bins.buffer;
  return { bins: buffer, transfer: [buffer] };
}

// ── LUT generation handler ──────────────────────────────────────────────────

function handleGenerateLuts(
  curves: Record<string, any>,
): { luts: Record<string, ArrayBuffer>; transfer: Transferable[] } {
  const rawLuts = generateAllCurveLuts(curves);
  const luts: Record<string, ArrayBuffer> = {};
  const transfer: Transferable[] = [];

  for (const [key, data] of Object.entries(rawLuts)) {
    const buf = data.buffer as ArrayBuffer;
    luts[key] = buf;
    transfer.push(buf);
  }

  return { luts, transfer };
}

// ── Message router ───────────────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent<AnyWorkerRequest>) => {
  const msg = e.data;

  try {
    switch (msg.type) {
      case 'cancel': {
        canceledRequests.add(msg.targetId);
        postResponse({ id: msg.id, type: 'cancel', targetId: msg.targetId });
        break;
      }

      case 'decode': {
        const { image, transfer } = await handleDecode(msg.buffer);
        if (isCanceled(msg.id)) {
          canceledRequests.delete(msg.id);
          break;
        }
        const response: DecodeResponse = { id: msg.id, type: 'decode', image };
        postResponse(response, transfer);
        break;
      }

      case 'histogram': {
        const { bins, transfer } = handleHistogram(msg.pixels, msg.width, msg.height);
        if (isCanceled(msg.id)) {
          canceledRequests.delete(msg.id);
          break;
        }
        const response: HistogramResponse = { id: msg.id, type: 'histogram', bins };
        postResponse(response, transfer);
        break;
      }

      case 'generateLuts': {
        const { luts, transfer } = handleGenerateLuts(msg.curves);
        if (isCanceled(msg.id)) {
          canceledRequests.delete(msg.id);
          break;
        }
        const response: GenerateLutsResponse = { id: msg.id, type: 'generateLuts', luts };
        postResponse(response, transfer);
        break;
      }

      default:
        postResponse({
          id: (msg as any).id,
          type: (msg as any).type,
          error: { message: `Unknown message type: ${(msg as any).type}` },
        } as any);
    }
  } catch (err) {
    postResponse({
      id: msg.id,
      type: msg.type,
      error: serializeError(err),
    } as any);
  }
};
