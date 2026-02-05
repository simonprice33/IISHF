"use client";

import { useEffect, useState } from "react";
import { NavBar as Navbar } from "./Navbar";
import { buildMenu } from "./buildMenu";
import type { NavItem } from "./types";
import { getChildren } from "@/lib/umbracoApi";

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

export function NavBarContainer() {
  const [items, setItems] = useState<NavItem[]>([]);
  const [debugStatus, setDebugStatus] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setDebugStatus("Loading navigation…");

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
                const catChildrenDelivery = await getChildren(
                  catKey,
                  500,
                  isNonTitleCategory(cat)
                );

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

        if (cancelled) return;
        setItems(enriched);
        setDebugStatus("");
      } catch (e) {
        console.error("NavBarContainer load failed", e);
        if (cancelled) return;
        setItems([]);
        setDebugStatus("Navigation failed to load");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return <Navbar items={items} debugStatus={debugStatus} />;
}
