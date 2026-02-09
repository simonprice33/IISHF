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

function getFileExtFromItem(x: DeliveryItem): string | undefined {
  const fd = (x.properties as Record<string, unknown> | undefined)?.fileDownload;
  if (!Array.isArray(fd) || fd.length === 0) return undefined;

  const first = fd[0] as { url?: unknown } | undefined;
  const url = asString(first?.url);
  if (!url) return undefined;

  const lastDot = url.lastIndexOf(".");
  if (lastDot < 0) return undefined;

  return url.substring(lastDot + 1).toLowerCase();
}

export function buildMenu(items: DeliveryItem[]): NavItem[] {
  return (items ?? [])
    .filter((x) => !!x.route?.path)
    .map((x) => ({
      title: x.name,
      url: normaliseHref(x.route!.path!), // ✅ key change
      navGroupKey: asString(x.properties?.navGroupKey) ?? undefined,
      fileExt: getFileExtFromItem(x),
      children: [],
    }));
}
