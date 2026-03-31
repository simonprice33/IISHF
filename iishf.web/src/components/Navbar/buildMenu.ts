import type { DeliveryItem } from "@/lib/umbracoTypes";
import { asString } from "@/lib/umbracoTypes";
import type { NavItem } from "./types";

function normaliseHref(pathOrUrl: string): string {
  const raw = (pathOrUrl ?? "").trim();
  if (!raw) return "/";

  // If Umbraco returns an absolute URL, strip origin so Next treats as internal.
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const u = new URL(raw);
      return u.pathname + (u.search ?? "") + (u.hash ?? "");
    } catch {
      // fall through
    }
  }

  return raw.startsWith("/") ? raw : `/${raw}`;
}

type MediaItem = {
  url?: string;
  extension?: string;
};

/**
 * Umbraco Delivery API returns media pickers as either a single object or an
 * array depending on the property editor config. Normalise both forms.
 */
function resolveMediaItem(x: DeliveryItem): MediaItem | undefined {
  const fd = (x.properties as Record<string, unknown> | undefined)?.fileDownload;
  if (!fd) return undefined;

  if (Array.isArray(fd)) {
    return fd.length > 0 ? (fd[0] as MediaItem) : undefined;
  }

  return fd as MediaItem;
}

function getFileExt(media: MediaItem): string | undefined {
  // Prefer the explicit extension field Umbraco exposes on media items
  if (media.extension) return media.extension.toLowerCase();

  // Fallback: derive from the URL string
  const url = media.url ?? "";
  const lastDot = url.lastIndexOf(".");
  if (lastDot < 0) return undefined;
  return url.substring(lastDot + 1).toLowerCase();
}

export function buildMenu(items: DeliveryItem[]): NavItem[] {
  return (items ?? [])
    .filter((x) => !!x.route?.path)
    .map((x) => {
      const media = resolveMediaItem(x);
      const fileExt = media ? getFileExt(media) : undefined;
      // Raw /media/… path — routed through the Next.js proxy at /api/umbraco/media/…
      const fileUrl = media?.url ?? undefined;

      return {
        title: x.name,
        url: normaliseHref(x.route!.path!),
        navGroupKey: asString(x.properties?.navGroupKey) ?? undefined,
        fileExt,
        fileUrl,
        children: [],
      };
    });
}
