/**
 * resolveAsset.ts
 *
 * Centralized asset resolution for SSR, Vite, and Electron environments.
 * Ensures URLs are properly formed preventing "Failed to parse URL" errors
 * in non-browser fetch contexts.
 */

export function resolveAsset(path: string): string {
  // Strip leading slash if present for clean joining
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  
  const base = import.meta.env.BASE_URL || "/";
  const urlPath = base.endsWith("/") ? `${base}${cleanPath}` : `${base}/${cleanPath}`;

  // Check if we are in an environment without a window (SSR/Node)
  if (typeof window === "undefined") {
    // In server environments (like Nitro/undici), fetch() requires an absolute URL.
    try {
      // VITE_DEV_SERVER_URL is often provided, otherwise fallback to local port
      const origin = process.env.VITE_DEV_SERVER_URL || process.env.URL || "http://127.0.0.1:3000";
      return new URL(urlPath, origin).href;
    } catch (e) {
      // Fallback
      return urlPath;
    }
  }

  // In the browser, the relative path (from base) works fine for fetch()
  return urlPath;
}
