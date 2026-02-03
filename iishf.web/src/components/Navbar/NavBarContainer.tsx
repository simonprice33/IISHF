"use client";

import { useEffect, useState } from "react";
import { getChildren } from "@/lib/umbracoApi";
import { buildMenu } from "./buildMenu";
import { Navbar } from "./Navbar";
import type { NavItem } from "./types";

export function NavBarContainer() {
  const [items, setItems] = useState<NavItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const children = await getChildren("home", 200);
        if (cancelled) return;

        setItems(buildMenu(children));
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

  return <Navbar items={items} />;
}
