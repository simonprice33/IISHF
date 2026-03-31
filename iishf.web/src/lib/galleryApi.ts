// src/lib/galleryApi.ts
import axios from "axios";

type DeliveryPagedResponse<T> = {
  total: number;
  items: T[];
};

export type DeliveryItem = {
  id: string;
  name?: string;
  contentType?: string;
  route?: { path?: string | null };
  properties?: Record<string, any>;
};

export type GallerySlide = {
  id: string;
  name: string;
  imageUrl: string;
  linkUrl?: string;
};

function getSiteOrigin(): string {
  // Mirror the pattern from newsApi.ts:
  // - In the browser we can rely on window.location.origin
  // - On the server, use an env var if you have one, otherwise fall back to localhost
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  const envOrigin =
    process.env.NEXT_PUBLIC_SITE_ORIGIN ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_ORIGIN;

  if (envOrigin) return envOrigin;

  // Final fallback (dev)
  return "http://localhost:3000";
}

function toAbsoluteUrl(path: string): string {
  // If you pass a relative path like "/api/umbraco/...."
  // this guarantees an absolute URL for axios in Server Components.
  return new URL(path, getSiteOrigin()).toString();
}

function normaliseRoutePathToFetchKey(routePath: string): string {
  // Umbraco route paths tend to be "/content/galleries/" etc.
  // fetch=children:<key> expects "content/galleries" (no leading/trailing slash)
  return routePath.replace(/^\/+/, "").replace(/\/+$/, "");
}

async function fetchChildrenByPath(fetchKey: string, take: number) {
  // IMPORTANT: match newsApi.ts style:
  // call our Next proxy route, not Umbraco directly
  const path = `/api/umbraco/delivery/api/v2/content?fetch=children:${encodeURIComponent(
    fetchKey
  )}&take=${take}`;

  const url = toAbsoluteUrl(path);
  const { data } = await axios.get<DeliveryPagedResponse<DeliveryItem>>(url);
  return data.items ?? [];
}

function extractLinkUrl(item: DeliveryItem): string | undefined {
  const p = item.properties ?? {};
  const v = p.linkUrl ?? p.url ?? p.link ?? p.href;
  if (!v) return undefined;
  return String(v);
}

function extractMediaUrl(item: DeliveryItem): string | undefined {
  const p = item.properties ?? {};

  // Common keys seen in Umbraco models
  const candidates = [
    p.image,
    p.media,
    p.picture,
    p.logo,
    p.thumbnail,
    p.backgroundImage,
  ];

  // 1) Direct string url
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c;
  }

  // 2) Object with url
  for (const c of candidates) {
    if (c && typeof c === "object") {
      if (typeof c.url === "string" && c.url.length > 0) return c.url;
      if (typeof c.src === "string" && c.src.length > 0) return c.src;
    }
  }

  // 3) As a last resort: scan properties for an object containing { url: string }
  for (const key of Object.keys(p)) {
    const v = p[key];
    if (v && typeof v === "object" && typeof v.url === "string" && v.url.length > 0) {
      return v.url;
    }
  }

  return undefined;
}

function toProxiedMediaUrl(rawUrl: string): string {
  // Goal: images must go through your Next proxy (you already have /api/umbraco/media/*)
  // So we convert:
  // - "/media/...."                         -> "/api/umbraco/media/..."
  // - "https://localhost:44395/media/...."  -> "/api/umbraco/media/..."
  // - already proxied "/api/umbraco/media"  -> unchanged
  // - other absolute URLs (rare)            -> keep absolute

  if (!rawUrl) return rawUrl;

  // already proxied
  if (rawUrl.startsWith("/api/umbraco/")) return rawUrl;

  // absolute url
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
    try {
      const u = new URL(rawUrl);
      if (u.pathname.startsWith("/media/") || u.pathname.startsWith("/umbraco/media/")) {
        const path = u.pathname.startsWith("/umbraco/media/")
          ? u.pathname.replace("/umbraco", "")
          : u.pathname;
        return `/api/umbraco${path}${u.search}`;
      }
      return rawUrl;
    } catch {
      // fall through
    }
  }

  // site-relative
  if (rawUrl.startsWith("/media/")) return `/api/umbraco${rawUrl}`;
  if (rawUrl.startsWith("/umbraco/media/")) return `/api/umbraco${rawUrl.replace("/umbraco", "")}`;

  return rawUrl;
}

/**
 * Member Associations slider:
 * Global > Content > Galleries (contentType: "gallery") > Main Carousel (contentType: "carouselGroup")
 * Slides are children of "Main Carousel"
 */
export async function getMemberAssociationSlides(): Promise<GallerySlide[]> {
  // 1) Fetch children under "content" and find the Galleries container
  const contentChildren = await fetchChildrenByPath("content", 200);

  const galleriesContainer =
    contentChildren.find((x) => x.contentType === "gallery" && (x.name ?? "").toLowerCase() === "galleries") ??
    contentChildren.find((x) => (x.name ?? "").toLowerCase() === "galleries");

  if (!galleriesContainer?.route?.path) return [];

  // 2) Fetch children under /content/galleries and find Main Carousel
  const galleriesKey = normaliseRoutePathToFetchKey(galleriesContainer.route.path);
  const galleriesChildren = await fetchChildrenByPath(galleriesKey, 500);

  const mainCarousel =
    galleriesChildren.find((x) => (x.name ?? "").toLowerCase() === "main carousel") ??
    galleriesChildren.find((x) => x.contentType === "carouselGroup") ??
    galleriesChildren.find((x) => (x.contentType ?? "").toLowerCase().includes("carousel"));

  if (!mainCarousel?.route?.path) return [];

  // 3) Slides are children of Main Carousel
  const carouselKey = normaliseRoutePathToFetchKey(mainCarousel.route.path);
  const slideItems = await fetchChildrenByPath(carouselKey, 500);

  const slides: GallerySlide[] = [];

  for (const item of slideItems) {
    const rawImageUrl = extractMediaUrl(item);
    if (!rawImageUrl) continue;

    slides.push({
      id: item.id,
      name: String(item.name ?? ""),
      imageUrl: toProxiedMediaUrl(String(rawImageUrl)),
      linkUrl: extractLinkUrl(item),
    });
  }

  return slides;
}
