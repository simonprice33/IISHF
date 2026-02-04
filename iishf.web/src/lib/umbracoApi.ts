import axios from "axios";
import type { DeliveryItem, DeliveryPagedResponse } from "./umbracoTypes";
import { asBool } from "./umbracoTypes";

const DELIVERY_V2 = "/api/umbraco/umbraco/delivery/api/v2/content";

function enc(v: string) {
  return encodeURIComponent(v);
}

// Umbraco built-in: umbracoNaviHide (can come back as bool/0/1/"true"/"false")
function isHiddenFromNav(item: DeliveryItem): boolean {
  const v = item.properties?.umbracoNaviHide;
  return asBool(v) === true;
}

export async function getChildren(parent: string, take = 200): Promise<DeliveryItem[]> {
  const url =
    `${DELIVERY_V2}` +
    `?fetch=children:${enc(parent)}` +
    `&sort=sortOrder:asc` +
    `&take=${take}`;

  const { data } = await axios.get<DeliveryPagedResponse<DeliveryItem>>(url);
  return (data.items ?? []).filter((x) => !isHiddenFromNav(x));
}
