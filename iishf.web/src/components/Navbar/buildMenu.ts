import type { DeliveryItem } from "@/lib/umbracoTypes";
import type { NavItem } from "./types";

export function buildMenu(items: DeliveryItem[]): NavItem[] {
  return (items ?? [])
    .filter((x): x is DeliveryItem & { route: { path: string } } => !!x.route?.path)
    .map((x) => ({
      title: x.name,
      url: x.route.path, // now strongly typed
      children: [],
    }));
}
