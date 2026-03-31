import axios from "axios";
import type { DeliveryItem, DeliveryPagedResponse } from "@/lib/umbracoTypes";
import { asString } from "@/lib/umbracoTypes";

const DELIVERY_V2 = "/api/umbraco/umbraco/delivery/api/v2/content";

function enc(v: string) {
  return encodeURIComponent(v);
}

/**
 * Client-side: relative paths are fine (browser knows the origin).
 * Server-side: must be absolute — resolve against NEXT_PUBLIC_SITE_URL so
 * the request goes through the Next.js proxy at /api/umbraco/...
 */
function toAbsoluteUrl(path: string): string {
  if (typeof window !== "undefined") return path;
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
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
 */
export function parseSanctionYear(sanctionNumber?: string): number | null {
  const sn = asString(sanctionNumber)?.trim();
  if (!sn || sn.length < 5) return null;
  const withoutPrefix = sn.substring(1);
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
 * Fetch children of a node by route key, filtering nav-hidden items.
 * Used client-side (navbar) and server-side (pages).
 */
export async function getChildren(
  parent: string,
  take = 200,
  applyNonTitleFilter = false
): Promise<DeliveryItem[]> {
  const path =
    `${DELIVERY_V2}` +
    `?fetch=children:${enc(parent)}` +
    `&sort=sortOrder:asc` +
    `&take=${take}`;

  const { data } = await axios.get<DeliveryPagedResponse<DeliveryItem>>(
    toAbsoluteUrl(path)
  );

  const visible = (data.items ?? []).filter((x) => !isHiddenFromNav(x));
  return applyNonTitleFilter ? filterNonTitleEventsByYear(visible) : visible;
}

/**
 * Fetch all children of a node without nav-hide filtering.
 * Used for content pages where every child should be shown.
 */
export async function getAllChildren(
  parent: string,
  take = 200
): Promise<DeliveryItem[]> {
  const path =
    `${DELIVERY_V2}` +
    `?fetch=children:${enc(parent)}` +
    `&sort=sortOrder:asc` +
    `&take=${take}`;

  const { data } = await axios.get<DeliveryPagedResponse<DeliveryItem>>(
    toAbsoluteUrl(path)
  );
  return data.items ?? [];
}

/**
 * Fetch a single content item by its route path.
 * Returns null if not found or on any network error.
 */
export async function getContentByPath(path: string): Promise<DeliveryItem | null> {
  const clean = path.startsWith("/") ? path : `/${path}`;
  const url = toAbsoluteUrl(`${DELIVERY_V2}/item${clean}`);
  try {
    const { data } = await axios.get<DeliveryItem>(url);
    return data;
  } catch {
    return null;
  }
}
