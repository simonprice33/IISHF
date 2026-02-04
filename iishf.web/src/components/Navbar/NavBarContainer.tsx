"use client";

import { useEffect, useState } from "react";
import { getChildren } from "@/lib/umbracoApi";
import type { NavItem } from "./types";
import { buildMenu } from "./buildMenu";
import { NavBar } from "./Navbar";

type Status = "loading" | "ok" | "error";

export function NavBarContainer() {
  const [items, setItems] = useState<NavItem[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setStatus("loading");

        // Home children = top-level nav items
        const topDelivery = await getChildren("home");
        const top = buildMenu(topDelivery);

        // Fetch children for each top item in parallel
        const withChildren = await Promise.all(
          top.map(async (t) => {
            // If it's a direct file URL (/media/...), no children
            if (t.url.startsWith("/media/")) return t;

            // Delivery API expects "path" identifiers (you’re using route.path like "/news/...")
            const pathKey = t.url.startsWith("/") ? t.url.slice(1) : t.url;
            const childDelivery = await getChildren(pathKey);
            const children = buildMenu(childDelivery);

            // Special case: tournaments needs 2 levels:
            // tournaments -> categories -> items
            if (t.title.toLowerCase() === "tournaments") {
              const categoriesWithChildren = await Promise.all(
                children.map(async (cat) => {
                  const catKey = cat.url.startsWith("/") ? cat.url.slice(1) : cat.url;
                  const catChildrenDelivery = await getChildren(catKey);
                  const catChildren = buildMenu(catChildrenDelivery);
                  return { ...cat, children: catChildren };
                })
              );

              return { ...t, children: categoriesWithChildren };
            }

            // Normal dropdowns: IISHF and Documents will now have children
            return { ...t, children };
          })
        );

        if (cancelled) return;

        setItems(withChildren);
        setStatus("ok");
      } catch (e) {
        console.error("NavBarContainer load failed", e);
        if (cancelled) return;
        setItems([]);
        setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return <NavBar items={items} status={status} />;
}
