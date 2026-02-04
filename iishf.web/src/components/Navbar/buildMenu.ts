import type { DeliveryItem } from "@/lib/umbracoTypes";
import { asString } from "@/lib/umbracoTypes";
import type { NavItem } from "./types";

// Try to pull a doc link from Umbraco "File download" style props.
// Your Delivery API example showed fileDownload: [{ url: "/media/..." , ... }]
function extractFileUrl(item: DeliveryItem): { url: string; ext?: string } | undefined {
  const fd = item.properties?.fileDownload;

  if (Array.isArray(fd) && fd.length > 0) {
    const first = fd[0] as any;
    const url = asString(first?.url);
    if (!url) return;
    const ext = url.includes(".") ? url.split(".").pop()?.toLowerCase() : undefined;
    return { url, ext };
  }

  return undefined;
}

export function buildMenu(items: DeliveryItem[]): NavItem[] {
  return (items ?? [])
    .filter((x) => !!x.route?.path || !!extractFileUrl(x))
    .map((x) => {
      const file = extractFileUrl(x);

      // tournaments grouping key you mentioned
      const navGroupKey = asString(x.properties?.navGroupKey);

      return {
        title: x.name,
        url: file?.url ?? x.route!.path!, // safe due to filter above
        navGroupKey,
        fileExt: file?.ext,
        children: [],
      };
    });
}
