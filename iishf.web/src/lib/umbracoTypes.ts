export type DeliveryItem = {
  id: string;
  name: string;
  contentType: string;
  createDate: string;   // ISO string
  updateDate: string;   // ISO string
  route?: {
    path?: string;
  };
  properties?: Record<string, unknown>;
};

export type DeliveryPagedResponse<T> = {
  total: number;
  items: T[];
};

export function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export function asBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0") return false;
  }
  return undefined;
}

/**
 * Extract the URL string from a Umbraco Delivery API media picker value.
 * Handles both single-object and array forms returned by the API.
 */
export function extractMediaUrl(value: unknown): string | undefined {
  if (!value) return undefined;
  const item = Array.isArray(value) ? value[0] : value;
  if (!item || typeof item !== "object") return undefined;
  const url = (item as Record<string, unknown>).url;
  return typeof url === "string" ? url : undefined;
}

/**
 * Convert a raw Umbraco media URL (or media picker value) to a URL
 * the browser can use. Relative /media/… paths are routed through
 * the Next.js proxy at /api/umbraco/media/…
 * Absolute URLs (Azure CDN etc.) are returned as-is.
 */
export function proxyMediaUrl(value: unknown): string | undefined {
  const raw = typeof value === "string" ? value : extractMediaUrl(value);
  if (!raw) return undefined;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const clean = raw.startsWith("/") ? raw : `/${raw}`;
  return `/api/umbraco${clean}`;
}

/**
 * Extract href + target from a Umbraco link picker value.
 */
export function extractLink(value: unknown): { url: string; target?: string } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const link = value as Record<string, unknown>;
  const url = typeof link.url === "string" ? link.url : undefined;
  if (!url) return undefined;
  return {
    url,
    target: typeof link.target === "string" ? link.target : undefined,
  };
}
