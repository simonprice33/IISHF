"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import type { NavItem, NavGroupKey } from "./types";
import styles from "./Navbar.module.css";

type Props = {
  items: NavItem[];
  debugStatus?: string; // kept for backwards-compat, not rendered
  status?: "loading" | "ok" | "error";
};

function groupLabel(key: NavGroupKey) {
  if (key === "europeanCups") return "European Cups";
  if (key === "europeanChampionships") return "European Championships";
  if (key === "noneTitleEvents") return "None Title Events";
  return key;
}

function guessTournamentGroup(item: NavItem): NavGroupKey {
  if (item.navGroupKey) return item.navGroupKey;
  const t = item.title.toLowerCase();
  if (t.includes("cup")) return "europeanCups";
  if (t.includes("championship")) return "europeanChampionships";
  if (t.includes("none title") || t.includes("non title")) return "noneTitleEvents";
  return "other";
}

function DocIcon({ ext }: { ext?: string }) {
  const e = (ext ?? "").toLowerCase();
  const label =
    e === "pdf"
      ? "PDF"
      : e === "doc" || e === "docx"
        ? "DOC"
        : e === "xls" || e === "xlsx"
          ? "XLS"
          : "FILE";

  return (
    <span className={styles.docIcon} data-ext={e}>
      {label}
    </span>
  );
}

/**
 * Converts a raw Umbraco /media/… path into a URL the browser can open.
 * - Relative paths are routed through the Next.js proxy at /api/umbraco/media/…
 * - Absolute paths (Azure CDN etc.) are used as-is.
 */
function resolveDocHref(fileUrl: string): string {
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) return fileUrl;
  const clean = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
  return `/api/umbraco${clean}`;
}

export function NavBar({ items, status }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  let closeTimer: ReturnType<typeof setTimeout> | null = null;
  function open(k: string) {
    if (closeTimer) clearTimeout(closeTimer);
    setOpenKey(k);
  }
  function closeSoon() {
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(() => setOpenKey(null), 150);
  }

  const top = items;
  const tournaments = top.find((x) => x.title.toLowerCase() === "tournaments");

  const tournamentsColumns = useMemo(() => {
    if (!tournaments?.children?.length) return [];

    const cols: Record<string, NavItem[]> = {};
    for (const cat of tournaments.children) {
      const key = guessTournamentGroup(cat);
      cols[key] = cat.children ?? [];
    }

    return [
      { key: "europeanCups", title: groupLabel("europeanCups"), items: cols["europeanCups"] ?? [] },
      { key: "europeanChampionships", title: groupLabel("europeanChampionships"), items: cols["europeanChampionships"] ?? [] },
      { key: "noneTitleEvents", title: groupLabel("noneTitleEvents"), items: cols["noneTitleEvents"] ?? [] },
    ];
  }, [tournaments]);

  function hasDropdown(i: NavItem) {
    if (i.title.toLowerCase() === "news") return false;
    return (i.children?.length ?? 0) > 0;
  }

  function closeMenu() {
    setMobileOpen(false);
    setOpenKey(null);
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link href="/" className={styles.logoWrap} aria-label="Home">
            <Image
              src="/images/IISHFLogo_text.png"
              alt="IISHF logo"
              width={770}
              height={212}
              className={styles.logoImg}
              priority
            />
          </Link>
        </div>

        <button
          className={styles.burger}
          onClick={() => setMobileOpen((x) => !x)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          ☰
        </button>

        <nav className={`${styles.nav} ${mobileOpen ? styles.navOpen : ""}`}>
          <ul className={styles.navList}>
            {top.map((item) => {
              const key = item.url;
              const dropdown = hasDropdown(item);
              const isOpen = openKey === key;
              const isTournaments = item.title.toLowerCase() === "tournaments";
              const isDocuments = item.title.toLowerCase() === "documents";

              return (
                <li
                  key={key}
                  className={styles.navItem}
                  onMouseEnter={() => dropdown && open(key)}
                  onMouseLeave={() => dropdown && closeSoon()}
                >
                  <div className={styles.navLinkRow}>
                    {dropdown ? (
                      <button
                        type="button"
                        className={styles.navLink}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenKey(isOpen ? null : key);
                        }}
                        aria-label={`Toggle ${item.title} menu`}
                        aria-expanded={isOpen}
                      >
                        {item.title}
                        <span className={styles.caret}>▾</span>
                      </button>
                    ) : (
                      <Link href={item.url} className={styles.navLink} onClick={closeMenu}>
                        {item.title}
                      </Link>
                    )}
                  </div>

                  {dropdown && isOpen && (
                    <div
                      className={`${styles.dropdown} ${isTournaments ? styles.mega : ""}`}
                      onMouseEnter={() => open(key)}
                      onMouseLeave={() => closeSoon()}
                    >
                      {isTournaments ? (
                        <div className={styles.megaGrid}>
                          {tournamentsColumns.map((col) => (
                            <div key={col.key} className={styles.megaCol}>
                              <div className={styles.megaTitle}>{col.title}</div>
                              <ul className={styles.dropList}>
                                {col.items.map((c) => (
                                  <li key={c.url} className={styles.dropItem}>
                                    <Link href={c.url} className={styles.dropLink} onClick={closeMenu}>
                                      {c.title}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <ul className={styles.dropList}>
                          {(item.children ?? []).map((c) => (
                            <li key={c.url} className={styles.dropItem}>
                              {isDocuments && c.fileUrl ? (
                                /* Document: open the actual file in a new tab */
                                <a
                                  href={resolveDocHref(c.fileUrl)}
                                  className={styles.dropLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={closeMenu}
                                >
                                  <DocIcon ext={c.fileExt} />
                                  {c.title}
                                </a>
                              ) : (
                                /* All other dropdown items: internal navigation */
                                <Link href={c.url} className={styles.dropLink} onClick={closeMenu}>
                                  {c.title}
                                </Link>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}

            <li className={styles.navItem}>
              <Link className={styles.navLink} href="/signup">Sign up</Link>
            </li>
            <li className={styles.navItem}>
              <Link className={styles.navLink} href="/signin">Sign in</Link>
            </li>
          </ul>

          {status === "error" && <div className={styles.status}>Menu failed to load.</div>}
        </nav>
      </div>
    </header>
  );
}
