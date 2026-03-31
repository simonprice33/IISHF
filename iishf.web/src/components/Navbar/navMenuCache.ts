/**
 * src/components/Navbar/navbarCache.ts
 *
 * Small client-side cache for the built nav menu.
 *
 * Why:
 * - If a navigation ever becomes a hard navigation (full page load), we can still
 *   avoid rebuilding the menu repeatedly by reading from sessionStorage.
 * - Even without full reloads, this prevents duplicated fetches if the component
 *   is ever remounted in development / fast refresh.
 *
 * Notes:
 * - sessionStorage is per-tab (good for dev, avoids stale menu across tabs).
 * - We keep an in-memory cache AND a single in-flight Promise to avoid races.
 */

import type { NavItem } from "./types";
import { buildMenu } from "./buildMenu";
import { getChildren } from "@/lib/umbracoApi";

const STORAGE_KEY = "iishf.navMenu.v2"; // bump when NavItem shape changes

let memoryCache: NavItem[] | null = null;
let inFlight: Promise<NavItem[]> | null = null;

function getPathKeyFromUrl(url: string): string {
  // "/tournaments/none-title-events/" -> "tournaments/none-title-events"
  const trimmed = url.replace(/^\//, "").replace(/\/$/, "");
  return trimmed || "home";
}

function isNonTitleCategory(item: NavItem): boolean {
  const key = (item.navGroupKey ?? "").toLowerCase();
  if (key === "nontitleevents") return true;

  const t = item.title.toLowerCase();
  return t.includes("none title") || t.includes("non-title") || t.includes("non title");
}

function readSessionCache(): NavItem[] | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as NavItem[];
    if (!Array.isArray(parsed)) return null;

    return parsed;
  } catch {
    return null;
  }
}

function writeSessionCache(items: NavItem[]): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage failures (private mode, quota, etc.)
  }
}

async function buildNavMenuFromUmbraco(): Promise<NavItem[]> {
  // This is your existing working logic, moved here verbatim.
  const topLevelDelivery = await getChildren("home");
  const topLevel = buildMenu(topLevelDelivery);

  const enriched: NavItem[] = [];

  for (const top of topLevel) {
    const titleLower = top.title.toLowerCase();

    // NEWS: must be a link only (no dropdown)
    if (titleLower === "news") {
      enriched.push({ ...top, children: [] });
      continue;
    }

    // Only these are dropdown containers in your UI
    if (titleLower === "iishf" || titleLower === "tournaments" || titleLower === "documents") {
      const key = getPathKeyFromUrl(top.url);
      const childrenDelivery = await getChildren(key);
      const childNav = buildMenu(childrenDelivery);

      if (titleLower === "tournaments") {
        const cats: NavItem[] = [];

        for (const cat of childNav) {
          const catKey = getPathKeyFromUrl(cat.url);

          // Only apply year filter to None Title Events category
          const catChildrenDelivery = await getChildren(catKey, 500, isNonTitleCategory(cat));
          const catChildrenNav = buildMenu(catChildrenDelivery);

          cats.push({
            ...cat,
            children: catChildrenNav,
          });
        }

        enriched.push({ ...top, children: cats });
        continue;
      }

      // Normal dropdown (IISHF / Documents)
      enriched.push({ ...top, children: childNav });
      continue;
    }

    // Default leaf
    enriched.push({ ...top, children: [] });
  }

  return enriched;
}

/**
 * Main entry point.
 * Returns cached menu if available, otherwise fetches/builds once and caches.
 */
export async function getNavMenu(): Promise<NavItem[]> {
  // 1) In-memory cache (fastest)
  if (memoryCache) return memoryCache;

  // 2) sessionStorage cache (survives full reloads in the same tab)
  const fromSession = readSessionCache();
  if (fromSession) {
    memoryCache = fromSession;
    return fromSession;
  }

  // 3) In-flight guard (prevents duplicate builds)
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const built = await buildNavMenuFromUmbraco();
    memoryCache = built;
    writeSessionCache(built);
    return built;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/**
 * Optional helper: force clear the cache (useful during development).
 */
export function clearNavMenuCache(): void {
  memoryCache = null;
  inFlight = null;

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
