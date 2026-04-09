"use client";

/**
 * src/components/Navbar/NavBarContainer.tsx
 */

import { useEffect, useState } from "react";
import { NavBar as Navbar } from "./Navbar";
import type { NavItem } from "./types";
import { getNavMenu } from "./navMenuCache";

export function NavBarContainer() {
  const [items, setItems] = useState<NavItem[]>([]);
  const [hasTodaysGames, setHasTodaysGames] = useState(false);

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

    async function checkTodaysGames() {
      try {
        const res = await fetch("/api/todays-games", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        // Show link if at least one event has at least one game
        const hasGames =
          Array.isArray(data) &&
          data.some(
            (ev: { games?: unknown[] }) =>
              Array.isArray(ev.games) && ev.games.length > 0
          );
        setHasTodaysGames(hasGames);
      } catch {
        // Silently ignore — link just won't show
      }
    }

    load();
    checkTodaysGames();

    return () => {
      cancelled = true;
    };
  }, []);

  // NOTE: We do NOT render any "Loading navigation…" text (per your requirement).
  return <Navbar items={items} hasTodaysGames={hasTodaysGames} />;
}
