"use client";

// src/components/News/NewsPageClient.tsx
import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NewsGrid } from "@/components/News/NewsGrid";
import styles from "./NewsPage.module.css";

type DeliveryPagedResponse<T> = { items?: T[] };

type DeliveryRoute = { path?: string };

type DeliveryItem = {
  id?: string;
  name?: string;
  route?: DeliveryRoute;
  properties?: Record<string, any>;
};

export type NewsListItem = {
  id: string;
  title: string;
  url: string;
  leadIn?: string | null;

  // dates
  postDateUtcIso?: string | null;
  createDateUtc?: string | null;

  // tags/categories
  categories: string[];

  // images
  imageUrl?: string | null;   // original
  thumbUrl?: string | null;   // cropped "Main" like cshtml
};

const DEFAULT_PAGE_SIZE = 9;

function normalizePath(p?: string): string {
  if (!p) return "/";
  return p.startsWith("/") ? p : `/${p}`;
}

function safeLower(s: string) {
  return (s ?? "").toString().toLowerCase();
}

function tryParseJson(val: any): any | null {
  if (!val) return null;
  if (typeof val === "object") return val;
  if (typeof val !== "string") return null;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
}

/**
 * Replicates your Razor thumbnail crop logic:
 * - Uses image cropper JSON "src"
 * - Finds crop alias "Main"
 * - If coordinates exist (x1/y1/x2/y2 as fractions), convert to pixel crop
 * - Else fallback to ?mode=crop&width&height
 */
function buildThumbUrlFromCropper(articleImage: any): { original?: string; thumb?: string } {
  const obj = tryParseJson(articleImage);
  if (!obj) return {};

  const original = typeof obj.src === "string" ? obj.src : undefined;
  if (!original) return {};

  const crops = Array.isArray(obj.crops) ? obj.crops : [];
  const mainCrop = crops.find((c: any) => safeLower(c?.alias) === "main");

  if (!mainCrop) {
    // If no crop, just use original
    return { original, thumb: original };
  }

  const width = Number(mainCrop.width);
  const height = Number(mainCrop.height);

  const coords = mainCrop.coordinates;
  const x1 = coords?.x1;
  const y1 = coords?.y1;
  const x2 = coords?.x2;
  const y2 = coords?.y2;

  const hasCoords =
    typeof x1 === "number" &&
    typeof y1 === "number" &&
    typeof x2 === "number" &&
    typeof y2 === "number" &&
    Number.isFinite(x1) &&
    Number.isFinite(y1) &&
    Number.isFinite(x2) &&
    Number.isFinite(y2) &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0;

  if (hasCoords) {
    const cropX = Math.floor(x1 * width);
    const cropY = Math.floor(y1 * height);
    const cropW = Math.floor((x2 - x1) * width);
    const cropH = Math.floor((y2 - y1) * height);

    const thumb = `${original}?mode=crop&x=${cropX}&y=${cropY}&width=${cropW}&height=${cropH}`;
    return { original, thumb };
  }

  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    const thumb = `${original}?mode=crop&width=${width}&height=${height}`;
    return { original, thumb };
  }

  return { original, thumb: original };
}

function toYear(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getUTCFullYear();
}

function buildOrderedTags(tags: string[], currentYear: number): string[] {
  // Mirrors your cshtml ordering:
  // - tags with a year < currentYear come LAST (match.Success => return year < today.Year)
  // - everything else first, then alpha
  const yearRegex = /\b(20\d{2})\b/;

  return [...tags]
    .sort((a, b) => {
      const aMatch = a.match(yearRegex);
      const bMatch = b.match(yearRegex);

      const aIsPastYear =
        aMatch && Number.isFinite(Number(aMatch[1])) ? Number(aMatch[1]) < currentYear : false;
      const bIsPastYear =
        bMatch && Number.isFinite(Number(bMatch[1])) ? Number(bMatch[1]) < currentYear : false;

      if (aIsPastYear !== bIsPastYear) return aIsPastYear ? 1 : -1; // past-year tags later
      return a.localeCompare(b);
    });
}

function buildQueryString(params: Record<string, string | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (String(v).trim() === "") return;
    sp.set(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export default function NewsPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [allItems, setAllItems] = useState<NewsListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // query params (same names as your cshtml + new q)
  const yearParam = searchParams.get("year") ?? "";
  const catParam = searchParams.get("cat") ?? "";
  const qParam = searchParams.get("q") ?? "";
  const pageParam = searchParams.get("page") ?? "1";

  const selectedYear = Number(yearParam) > 0 ? Number(yearParam) : 0;
  const selectedCat = catParam.trim();
  const searchText = qParam.trim();
  const selectedPage = Math.max(1, Number(pageParam) || 1);

  // Fetch once (client-side) from your existing proxy route
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setLoadError(null);

        // Match what you’ve been doing elsewhere: call the Next proxy,
        // which then calls https://localhost:44395/umbraco/delivery/api/v2/...
        const res = await fetch(
          "/api/umbraco/delivery/api/v2/content?fetch=children:news&take=1000",
          { cache: "no-store" }
        );

        if (!res.ok) {
          throw new Error(`News fetch failed: ${res.status} ${res.statusText}`);
        }

        const data = (await res.json()) as DeliveryPagedResponse<DeliveryItem>;
        const items = Array.isArray(data.items) ? data.items : [];

        const mapped: NewsListItem[] = items.map((x) => {
          const id = (x.id ?? "").toString();
          const props = x.properties ?? {};
          const routePath = normalizePath(x.route?.path);

          const postDate =
            (props.postDate as string | undefined) ??
            (props.PostDate as string | undefined) ??
            null;

          const createDate =
            (props.createDateUtc as string | undefined) ??
            (props.createDate as string | undefined) ??
            (props.CreateDateUtc as string | undefined) ??
            null;

          const categories = Array.isArray(props.newsCategories)
            ? (props.newsCategories as string[]).filter(Boolean)
            : [];

          const leadIn =
            (props.leadIn as string | undefined) ??
            (props.LeadIn as string | undefined) ??
            null;

          const cropper = props.articleImage ?? props.ArticleImage ?? null;
          const { original, thumb } = buildThumbUrlFromCropper(cropper);

          return {
            id,
            title: (x.name ?? "").toString(),
            url: routePath,
            leadIn,
            postDateUtcIso: postDate,
            createDateUtc: createDate,
            categories,
            imageUrl: original ?? null,
            thumbUrl: thumb ?? null,
          };
        });

        // Only keep visible / dated items like your cshtml does:
        const now = new Date();
        const filtered = mapped.filter((n) => {
          // cshtml: postDate <= today and IsVisible
          // Delivery already returns visible children typically; we enforce postDate if present
          const iso = n.postDateUtcIso ?? n.createDateUtc ?? null;
          if (!iso) return true;
          const d = new Date(iso);
          if (Number.isNaN(d.getTime())) return true;
          return d.getTime() <= now.getTime();
        });

        // Sort desc by postDate (fallback createDate)
        filtered.sort((a, b) => {
          const ad = new Date(a.postDateUtcIso ?? a.createDateUtc ?? 0).getTime();
          const bd = new Date(b.postDateUtcIso ?? b.createDateUtc ?? 0).getTime();
          return bd - ad;
        });

        if (!cancelled) setAllItems(filtered);
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message ?? "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // Build filter options from ALL items (like cshtml does)
  const filterData = useMemo(() => {
    const years = new Set<number>();
    const tags = new Set<string>();
    const nowYear = new Date().getUTCFullYear();

    allItems.forEach((n) => {
      const y = toYear(n.postDateUtcIso ?? n.createDateUtc ?? null);
      if (y) years.add(y);
      (n.categories ?? []).forEach((c) => tags.add(c));
    });

    const yearList = Array.from(years).sort((a, b) => b - a);
    const tagList = buildOrderedTags(Array.from(tags), nowYear);

    return { yearList, tagList };
  }, [allItems]);

  // Apply filters + search
  const filteredItems = useMemo(() => {
    let items = allItems;

    if (selectedYear > 0) {
      items = items.filter((n) => {
        const y = toYear(n.postDateUtcIso ?? n.createDateUtc ?? null);
        return y === selectedYear;
      });
    }

    if (selectedCat) {
      items = items.filter((n) => (n.categories ?? []).includes(selectedCat));
    }

    if (searchText) {
      const q = safeLower(searchText);
      items = items.filter((n) => {
        const inTitle = safeLower(n.title).includes(q);
        const inLead = safeLower(n.leadIn ?? "").includes(q);
        return inTitle || inLead;
      });
    }

    return items;
  }, [allItems, selectedYear, selectedCat, searchText]);

  // Paging (same idea as cshtml)
  const pageSize = DEFAULT_PAGE_SIZE;
  const numberOfPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(selectedPage, numberOfPages);

  const pagedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, safePage]);

  function go(params: { year?: number; cat?: string; q?: string; page?: number }) {
    const next = {
      year: params.year && params.year > 0 ? String(params.year) : "",
      cat: params.cat ?? "",
      q: params.q ?? "",
      page: params.page && params.page > 1 ? String(params.page) : "",
    };

    const qs = buildQueryString(next);
    router.push(`${pathname}${qs}`);
  }

  function clearFilters() {
    router.push(pathname);
  }

  // Pagination window like cshtml (max 10)
  const pageWindow = useMemo(() => {
    let startPage = 1;
    let endPage = numberOfPages;

    if (numberOfPages > 10) {
      if (safePage <= 6) {
        endPage = 10;
      } else if (safePage + 4 >= numberOfPages) {
        startPage = numberOfPages - 9;
      } else {
        startPage = safePage - 5;
        endPage = safePage + 4;
      }
    }

    const pages: number[] = [];
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  }, [numberOfPages, safePage]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>News</h1>
        <p className={styles.subtitle}>Browse IISHF news articles. Filter by year, tags, or search.</p>
      </div>

      <div className={styles.layout}>
        {/* Filters (right on desktop like cshtml) */}
        <aside className={styles.filters}>
          <div className={styles.filtersHeader}>
            <h2 className={styles.filtersTitle}>Filters</h2>
            <button type="button" className={styles.clearBtn} onClick={clearFilters}>
              Clear Filters
            </button>
          </div>

          <div className={styles.searchBlock}>
            <label className={styles.label} htmlFor="news-search">
              Search
            </label>
            <input
              id="news-search"
              className={styles.searchInput}
              value={searchText}
              placeholder="Search news..."
              onChange={(e) => go({ year: selectedYear, cat: selectedCat, q: e.target.value, page: 1 })}
            />
          </div>

          <div className={styles.block}>
            <h3 className={styles.blockTitle}>Article Year</h3>
            <div className={styles.badges}>
              {filterData.yearList.map((y) => {
                const active = selectedYear === y;
                return (
                  <button
                    key={y}
                    type="button"
                    className={`${styles.badge} ${active ? styles.badgeActive : ""}`}
                    onClick={() => go({ year: active ? 0 : y, cat: selectedCat, q: searchText, page: 1 })}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.block}>
            <h3 className={styles.blockTitle}>Tags</h3>
            <div className={styles.badges}>
              {filterData.tagList.map((t) => {
                const active = selectedCat.localeCompare(t, undefined, { sensitivity: "accent" }) === 0;
                return (
                  <button
                    key={t}
                    type="button"
                    className={`${styles.badge} ${active ? styles.badgeActive : ""}`}
                    onClick={() => go({ year: selectedYear, cat: active ? "" : t, q: searchText, page: 1 })}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Results */}
        <main className={styles.results}>
          {loading && <div className={styles.status}>Loading news…</div>}
          {!loading && loadError && <div className={styles.statusError}>Failed to load: {loadError}</div>}

          {!loading && !loadError && (
            <>
              <div className={styles.resultsHeader}>
                <h2 className={styles.resultsTitle}>Articles</h2>
                <div className={styles.count}>
                  Showing {pagedItems.length} of {filteredItems.length}
                </div>
              </div>

              {/* Uses your existing NewsGrid + NewsCard visuals */}
              <NewsGrid items={pagedItems} />

              {/* Paging */}
              {numberOfPages > 1 && (
                <nav className={styles.pagination} aria-label="News pagination">
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={safePage <= 1}
                    onClick={() => go({ year: selectedYear, cat: selectedCat, q: searchText, page: safePage - 1 })}
                  >
                    «
                  </button>

                  {pageWindow.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`${styles.pageBtn} ${p === safePage ? styles.pageBtnActive : ""}`}
                      onClick={() => go({ year: selectedYear, cat: selectedCat, q: searchText, page: p })}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={safePage >= numberOfPages}
                    onClick={() => go({ year: selectedYear, cat: selectedCat, q: searchText, page: safePage + 1 })}
                  >
                    »
                  </button>
                </nav>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
