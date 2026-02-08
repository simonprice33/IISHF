import axios from "axios";

export type DeliveryPagedResponse<T> = {
  total?: number;
  items?: T[];
};

export type DeliveryItem = {
  id: string;
  name?: string;
  createDate?: string; // ISO with Z
  updateDate?: string; // ignored for ordering
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
  postDateUtc?: string | null;   // normalized to UTC
  createDateUtc?: string | null; // already UTC from API
};

function getSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000"
  );
}

function toAbsoluteUrl(path: string): string {
  if (typeof window !== "undefined") return path;
  return new URL(path, getSiteOrigin()).toString();
}

/**
 * Umbraco returns postDate without timezone sometimes: "2024-01-02T12:00:00"
 * JS Date.parse treats that as local time. We want UTC consistency.
 *
 * If no timezone suffix is present, assume UTC and append "Z".
 */
function normalizeIsoToUtc(value?: string | null): string | null {
  if (!value) return null;

  const s = value.trim();
  if (!s) return null;

  // Already has timezone info?
  // - ends with Z
  // - or has +HH:MM / -HH:MM
  if (/[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s)) return s;

  return `${s}Z`;
}

function toEpochUtc(value?: string | null): number {
  const iso = normalizeIsoToUtc(value);
  if (!iso) return Number.NEGATIVE_INFINITY;

  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : Number.NEGATIVE_INFINITY;
}

export async function getLatestNews(take = 6, parentKey = "news"): Promise<NewsListItem[]> {
  // Fetch enough to sort properly
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

        // Normalize postDate to UTC so ordering is correct
        postDateUtc: normalizeIsoToUtc(props.postDate ?? null),
        createDateUtc: x.createDate ?? null,
      };
    });

  /**
   * ✅ AUTHORITATIVE ORDER (latest first):
   * 1) postDate DESC (normalized UTC)
   * 2) createDate DESC
   * 3) stable tie-breaker (id)
   *
   * IMPORTANT: primary date uses postDate if present, otherwise createDate.
   */
  items.sort((a, b) => {
    const aPrimary = a.postDateUtc ? toEpochUtc(a.postDateUtc) : toEpochUtc(a.createDateUtc);
    const bPrimary = b.postDateUtc ? toEpochUtc(b.postDateUtc) : toEpochUtc(b.createDateUtc);

    if (bPrimary !== aPrimary) return bPrimary - aPrimary;

    // Stable tie-breaker so list doesn't shuffle between runs
    return (b.id || "").localeCompare(a.id || "");
  });

  return items.slice(0, take);
}
