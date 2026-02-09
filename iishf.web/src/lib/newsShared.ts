// src/lib/newsShared.ts

type CropperJson = {
  url?: string; // Delivery API commonly uses "url"
  src?: string; // sometimes used by older shapes
  crops?: Array<{
    alias?: string;
    width?: number;
    height?: number;
    coordinates?: { x1?: number; y1?: number; x2?: number; y2?: number };
  }>;
};

function parseCropper(value: unknown): CropperJson | null {
  if (!value) return null;

  if (typeof value === "object") return value as CropperJson;

  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;

    // plain URL string
    if (!s.startsWith("{")) return { url: s };

    try {
      return JSON.parse(s) as CropperJson;
    } catch {
      return null;
    }
  }

  return null;
}

function proxyIfMedia(url: string): string {
  // If Umbraco returns /media/..., serve via our proxy so it resolves under localhost:3000
  if (url.startsWith("/media/")) return `/api/umbraco${url}`;
  return url;
}

/**
 * Builds a best-effort thumbnail URL for Umbraco cropper data.
 * Uses the "Main" crop if present, otherwise returns base URL.
 */
export function buildNewsThumbUrl(articleImage: unknown): string | null {
  const cropper = parseCropper(articleImage);

  const raw = (cropper?.url ?? cropper?.src ?? "").toString().trim();
  if (!raw) return null;

  const base = proxyIfMedia(raw);

  const crops = Array.isArray(cropper?.crops) ? cropper!.crops! : [];
  const main = crops.find((c) => (c?.alias || "").toString() === "Main");
  if (!main) return base;

  const width = Number(main.width);
  const height = Number(main.height);

  const coords = main.coordinates;
  if (
    coords &&
    typeof coords.x1 === "number" &&
    typeof coords.y1 === "number" &&
    typeof coords.x2 === "number" &&
    typeof coords.y2 === "number" &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0
  ) {
    const cropX = Math.floor(coords.x1 * width);
    const cropY = Math.floor(coords.y1 * height);
    const cropW = Math.floor((coords.x2 - coords.x1) * width);
    const cropH = Math.floor((coords.y2 - coords.y1) * height);

    if (cropW > 0 && cropH > 0) {
      return `${base}?mode=crop&x=${cropX}&y=${cropY}&width=${cropW}&height=${cropH}`;
    }

    return base;
  }

  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return `${base}?mode=crop&width=${width}&height=${height}`;
  }

  return base;
}
