"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import type { NavItem, NavGroupKey } from "./types";
import styles from "./Navbar.module.css";

type Props = {
  items: NavItem[];
  status?: "loading" | "ok" | "error";
};

function groupLabel(key: NavGroupKey) {
  if (key === "europeanCups") return "European Cups";
  if (key === "europeanChampionships") return "European Championships";
  if (key === "noneTitleEvents") return "None Title Events";
  return key;
}

function guessTournamentGroup(item: NavItem): NavGroupKey {
  // Use navGroupKey if present; otherwise fallback to title match
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
    e === "pdf" ? "PDF" :
    e === "doc" || e === "docx" ? "DOC" :
    e === "xls" || e === "xlsx" ? "XLS" :
    "FILE";

  return <span className={styles.docIcon}>{label}</span>;
}

export function NavBar({ items, status }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Small delay prevents “hover collapses before click”
  let closeTimer: any = null;
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

    // tournaments.children are categories like European Cups, etc,
    // each category has its own children now.
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
    // News should NOT dropdown even if someone accidentally adds children later
    if (i.title.toLowerCase() === "news") return false;
    return (i.children?.length ?? 0) > 0;
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
                  {/* Use Link always so click works; dropdown opens by hover (desktop) or caret button (mobile) */}
                  <div className={styles.navLinkRow}>
                    <Link
                      href={item.url}
                      className={styles.navLink}
                      onClick={() => {
                        // On mobile: clicking navigates; close menu
                        setMobileOpen(false);
                        setOpenKey(null);
                      }}
                    >
                      {item.title}
                    </Link>

                    {dropdown && (
                      <button
                        className={styles.caretBtn}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenKey(isOpen ? null : key);
                        }}
                        aria-label={`Toggle ${item.title} menu`}
                        aria-expanded={isOpen}
                      >
                        ▾
                      </button>
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
                                    <Link
                                      href={c.url}
                                      className={styles.dropLink}
                                      onClick={() => {
                                        setMobileOpen(false);
                                        setOpenKey(null);
                                      }}
                                    >
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
                              <Link
                                href={c.url}
                                className={styles.dropLink}
                                onClick={() => {
                                  setMobileOpen(false);
                                  setOpenKey(null);
                                }}
                              >
                                {isDocuments && <DocIcon ext={c.fileExt} />}
                                {c.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}

            {/* Auth links can be hard-coded for now */}
            <li className={styles.navItem}><Link className={styles.navLink} href="/signup">Sign up</Link></li>
            <li className={styles.navItem}><Link className={styles.navLink} href="/signin">Sign in</Link></li>
          </ul>

          {status === "error" && (
            <div className={styles.status}>Menu failed to load.</div>
          )}
        </nav>
      </div>
    </header>
  );
}
