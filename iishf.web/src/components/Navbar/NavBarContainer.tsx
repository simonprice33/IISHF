"use client";

import { useEffect, useState } from "react";
import { getChildren } from "@/lib/umbracoApi";
import type { DeliveryItem } from "@/lib/umbracoTypes";
import { buildMenu } from "./buildMenu";
import type { NavItem } from "./types";
import { NavBar } from "./Navbar";

function findByTitle(items: NavItem[], title: string) {
  const t = title.toLowerCase();
  return items.find((x) => x.title.toLowerCase() === t);
}

async function hydrateChildren(parent: NavItem): Promise<NavItem> {
  const childrenDelivery = await getChildren(parent.url);
  const children = buildMenu(childrenDelivery);
  return { ...parent, children };
}

// For tournaments: we expect:
// Tournaments
//   - European Cups
//       - U13...
//       - U16...
//   - European Championships
//       - Men...
//       - U19...
//   - None Title Events
//       - Junior Masters...
async function hydrateTournaments(tournaments: NavItem): Promise<NavItem> {
  const groupsDelivery = await getChildren(tournaments.url);
  const groups = buildMenu(groupsDelivery);

  const hydratedGroups: NavItem[] = [];
  for (const g of groups) {
    const pagesDelivery = await getChildren(g.url);
    hydratedGroups.push({
      ...g,
      children: buildMenu(pagesDelivery),
    });
  }

  // Keep 3 columns max (as per your requirement)
  return {
    ...tournaments,
    children: hydratedGroups.slice(0, 3),
  };
}

export function NavBarContainer() {
  const [items, setItems] = useState<NavItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // 1) top-level nav items under home
        const rootDelivery: DeliveryItem[] = await getChildren("home");
        const root = buildMenu(rootDelivery);

        // 2) hydrate each top-level item
        const hydrated: NavItem[] = [];
        for (const item of root) {
          hydrated.push(await hydrateChildren(item));
        }

        // 3) special-case tournaments mega menu
        const tournaments = findByTitle(hydrated, "Tournaments");
        if (tournaments) {
          const withMega = await hydrateTournaments(tournaments);

          const replaced = hydrated.map((x) => (x.url === tournaments.url ? withMega : x));
          if (!cancelled) setItems(replaced);
          return;
        }

        if (!cancelled) setItems(hydrated);
      } catch (e) {
        console.error("NavBarContainer load failed", e);
        if (!cancelled) setItems([]);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return <NavBar items={items} />;
}
