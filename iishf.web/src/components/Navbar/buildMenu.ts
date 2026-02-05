import type { DeliveryItem } from "@/lib/umbracoTypes";
import { asString } from "@/lib/umbracoTypes";
import type { NavItem } from "./types";

function getFileExtFromItem(x: DeliveryItem): string | undefined {
  // Document items usually have properties.fileDownload: [{ url: "/media/.../file.pdf", ... }]
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
      url: x.route!.path!, // safe due to filter
      navGroupKey: asString(x.properties?.navGroupKey) ?? undefined,
      fileExt: getFileExtFromItem(x),
      children: [],
    }));
}
