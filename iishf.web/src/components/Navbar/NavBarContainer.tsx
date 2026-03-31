"use client";

/**
 * src/components/Navbar/NavBarContainer.tsx
 *
 * Minimal change:
 * - Replace the inline build/fetch logic with a cached call to getNavMenu().
 *
 * This avoids repeated menu rebuilds (especially after any hard refresh),
 * and dramatically reduces repeated calls into Umbraco during development.
 */

import { useEffect, useState } from "react";
import { NavBar as Navbar } from "./Navbar";
import type { NavItem } from "./types";
import { getNavMenu } from "./navMenuCache";

export function NavBarContainer() {
  const [items, setItems] = useState<NavItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const menu = await getNavMenu();
        if (cancelled) return;
        setItems(menu);
      } catch (e) {
        console.error("NavBarContainer load failed", e);
        if (cancelled) return;
        setItems([]);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  // NOTE: We do NOT render any “Loading navigation…” text (per your requirement).
  return <Navbar items={items} />;
}
