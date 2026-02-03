import type { DeliveryItem } from "@/lib/umbracoTypes";
import type { NavItem } from "./types";

function hasPath(item: DeliveryItem): item is DeliveryItem & { route: { path: string } } {
  return typeof item.route?.path === "string" && item.route.path.length > 0;
}

export function buildMenu(items: DeliveryItem[]): NavItem[] {
  return (items ?? [])
    .filter(hasPath)
    .map((x) => ({
      title: x.name,
      url: x.route.path,
      children: [],
    }));
}
