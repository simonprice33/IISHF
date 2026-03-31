// src/lib/newsApi.ts
import axios from "axios";

export type DeliveryPagedResponse<T> = {
  total?: number;
  items?: T[];
};

export type DeliveryItem = {
  id: string;
  name?: string;
  createDate?: string; // ISO with Z
  updateDate?: string;
  route?: { path?: string };
  properties?: Record<string, unknown>;
};

export type NewsListItem = {
  id: string;
  title: string;
  url: string;

  leadIn?: string | null;
  articleImage?: unknown | null;

  // sorting fields
  postDateUtc?: string | null;
  createDateUtc?: string | null;
};

function getSiteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000";
}

function toAbsoluteUrl(path: string): string {
  if (typeof window !== "undefined") return path;
  return new URL(path, getSiteOrigin()).toString();
}

/**
 * Umbraco can return postDate without timezone e.g. "2026-01-06T00:00:00"
 * Treat missing timezone as UTC by appending Z.
 */
function normalizeIsoToUtc(value?: string | null): string | null {
  if (!value) return null;

  const s = value.trim();
  if (!s) return null;

  if (/[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s)) return s;

  return `${s}Z`;
}

function toEpochUtc(value?: string | null): number {
  const iso = normalizeIsoToUtc(value);
  if (!iso) return Number.NEGATIVE_INFINITY;

  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : Number.NEGATIVE_INFINITY;
}

/**
 * Returns latest news, sorted newest-first.
 * Signature intentionally kept as ONE optional arg to avoid ripples.
 */
export async function getLatestNews(take = 6): Promise<NewsListItem[]> {
  const parentKey = "news";
  const upstreamTake = Math.max(100, take);

  const path =
    `/api/umbraco/delivery/api/v2/content` +
    `?fetch=children:${encodeURIComponent(parentKey)}` +
    `&take=${upstreamTake}`;

  const url = toAbsoluteUrl(path);
  const { data } = await axios.get<DeliveryPagedResponse<DeliveryItem>>(url);

  const items: NewsListItem[] = (data.items ?? [])
    .filter((x) => !!x.route?.path)
    .map((x) => {
      const props = (x.properties ?? {}) as Record<string, any>;

      return {
        id: x.id,
        url: x.route!.path!,
        title: props.articleTitle ?? x.name ?? "Untitled",
        leadIn: props.leadIn ?? null,
        articleImage: props.articleImage ?? null,
        postDateUtc: normalizeIsoToUtc(props.postDate ?? null),
        createDateUtc: x.createDate ?? null,
      };
    });

  items.sort((a, b) => {
    const aPrimary = a.postDateUtc ? toEpochUtc(a.postDateUtc) : toEpochUtc(a.createDateUtc);
    const bPrimary = b.postDateUtc ? toEpochUtc(b.postDateUtc) : toEpochUtc(b.createDateUtc);

    if (bPrimary !== aPrimary) return bPrimary - aPrimary;
    return (b.id || "").localeCompare(a.id || "");
  });

  return items.slice(0, take);
}


