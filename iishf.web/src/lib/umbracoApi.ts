import type { DeliveryItem, DeliveryPagedResponse } from "./umbracoTypes";
import { apiClient } from "./apiClient";

const DELIVERY_V2 = "/api/umbraco/umbraco/delivery/api/v2/content";

function enc(v: string) {
  return encodeURIComponent(v);
}

function isHiddenFromNav(item: DeliveryItem): boolean {
  const v = item.properties?.umbracoNaviHide;

  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;

  if (typeof v === "string") {
    const s = v.toLowerCase().trim();
    return s === "true" || s === "1";
  }

  return false;
}

export async function getChildren(parent: string, take = 200): Promise<DeliveryItem[]> {
  const url =
    `${DELIVERY_V2}` +
    `?fetch=children:${enc(parent)}` +
    `&sort=sortOrder:asc` +
    `&take=${take}`;

  const { data } = await apiClient.get<DeliveryPagedResponse<DeliveryItem>>(url);

  return (data.items ?? []).filter((x) => !isHiddenFromNav(x) && !!x.route?.path);
}
