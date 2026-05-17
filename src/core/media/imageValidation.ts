/**
 * imageValidation.ts
 *
 * Validates uploaded files before attempting to load them into memory.
 * Prevents WebGL crashes from massive textures or unsupported formats.
 */

export const MAX_IMAGE_SIZE_MB = 100;
export const MAX_IMAGE_DIMENSION = 16384; // Typical max WebGL texture size
export const SUPPORTED_BROWSER_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImageFile(file: File): ValidationResult {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  // Keep this list honest. TIFF/HEIC/RAW require dedicated decoders and are
  // intentionally not accepted by the SDR browser decode path.
  if (!SUPPORTED_BROWSER_IMAGE_TYPES.includes(file.type as any)) {
    const type = file.type || "unknown";
    return { valid: false, error: `Unsupported format: ${type}` };
  }

  // 2. File size validation
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_IMAGE_SIZE_MB) {
    return { valid: false, error: `File too large (${sizeMB.toFixed(1)}MB). Max allowed is ${MAX_IMAGE_SIZE_MB}MB` };
  }

  return { valid: true };
}

export function validateImageDimensions(width: number, height: number): ValidationResult {
  if (width === 0 || height === 0) {
    return { valid: false, error: "Invalid image dimensions (0x0)" };
  }
  
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    return { valid: false, error: `Image dimensions (${width}x${height}) exceed maximum supported size (${MAX_IMAGE_DIMENSION}px)` };
  }

  return { valid: true };
}
