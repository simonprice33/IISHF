import axios from "axios";
import type { DeliveryItem, DeliveryPagedResponse } from "@/lib/umbracoTypes";
import { asString } from "@/lib/umbracoTypes";

const DELIVERY_V2 = "/api/umbraco/umbraco/delivery/api/v2/content";

function enc(v: string) {
  return encodeURIComponent(v);
}

function isHiddenFromNav(item: DeliveryItem): boolean {
  const v = item.properties?.umbracoNaviHide;

  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    return s === "true" || s === "1";
  }

  return false;
}

/**
 * "B2026-01" -> 2026
 * Rule: trim first char (B), split at "-", take first token
 */
export function parseSanctionYear(sanctionNumber?: string): number | null {
  const sn = asString(sanctionNumber)?.trim();
  if (!sn || sn.length < 5) return null;

  const withoutPrefix = sn.substring(1); // drop "B"
  const yearPart = withoutPrefix.split("-")[0];

  const year = Number.parseInt(yearPart, 10);
  return Number.isFinite(year) ? year : null;
}

function filterNonTitleEventsByYear(items: DeliveryItem[]): DeliveryItem[] {
  const nowYear = new Date().getFullYear();
  const maxYear = nowYear + 1;

  return items.filter((x) => {
    const sanction = asString(x.properties?.sanctionNumber);
    const year = parseSanctionYear(sanction);
    if (year == null) return false;

    return year >= nowYear && year <= maxYear;
  });
}

/**
 * Fetch children of a node by key ("home", "news", "documents", etc.)
 * If applyNonTitleFilter=true, applies the sanction year filter.
 */
export async function getChildren(
  parent: string,
  take = 200,
  applyNonTitleFilter = false
): Promise<DeliveryItem[]> {
  const url =
    `${DELIVERY_V2}` +
    `?fetch=children:${enc(parent)}` +
    `&sort=sortOrder:asc` +
    `&take=${take}`;

  const { data } = await axios.get<DeliveryPagedResponse<DeliveryItem>>(url);

  const visible = (data.items ?? []).filter((x) => !isHiddenFromNav(x));

  return applyNonTitleFilter ? filterNonTitleEventsByYear(visible) : visible;
}
