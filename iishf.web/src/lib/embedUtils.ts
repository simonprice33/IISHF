/**
 * Shared embed-URL utilities used by both MediaTab and LivestreamContainer.
 */

function detectProvider(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("youtu.be") || u.includes("youtube.com")) return "youtube";
  if (u.includes("vimeo.com")) return "vimeo";
  if (u.includes("twitch.tv")) return "twitch";
  if (u.includes("sportdeutschland.tv")) return "sportdeutschland";
  if (u.includes("sport-europe") || u.includes("sporteurope")) return "sporteurope";
  if (u.includes("streamable.com")) return "streamable";
  return "generic";
}

function getTwitchParent(): string {
  if (typeof window === "undefined") return "localhost";
  return window.location.hostname || "localhost";
}

export function buildEmbedUrl(
  rawUrl: string
): { provider: string; embedUrl: string } | null {
  if (!rawUrl) return null;
  const provider = detectProvider(rawUrl);

  try {
    const abs =
      rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
        ? rawUrl
        : `https://${rawUrl}`;

    const url = new URL(abs);
    const host = url.hostname.toLowerCase();
    const path = url.pathname;

    if (provider === "youtube") {
      // youtu.be/ID
      if (host.includes("youtu.be")) {
        const id = path.split("/").filter(Boolean)[0];
        if (!id) return null;
        return { provider, embedUrl: `https://www.youtube.com/embed/${id}` };
      }

      if (host.includes("youtube.com")) {
        const parts = path.split("/").filter(Boolean);

        // watch?v=ID
        const v = url.searchParams.get("v");
        if (v) return { provider, embedUrl: `https://www.youtube.com/embed/${v}` };

        // Already an embed URL: /embed/ID
        const embedIdx = parts.findIndex((p) => p === "embed");
        if (embedIdx >= 0 && parts[embedIdx + 1]) {
          return { provider, embedUrl: `https://www.youtube.com/embed/${parts[embedIdx + 1]}` };
        }

        // Live or Shorts URL: /live/ID  or  /shorts/ID
        const liveIdx = parts.findIndex((p) => p === "live" || p === "shorts");
        if (liveIdx >= 0 && parts[liveIdx + 1]) {
          return { provider, embedUrl: `https://www.youtube.com/embed/${parts[liveIdx + 1]}` };
        }
      }
      return null;
    }

    if (provider === "vimeo") {
      const parts = path.split("/").filter(Boolean);
      const id = parts.includes("video")
        ? parts[parts.indexOf("video") + 1]
        : parts[0];
      if (!id) return null;
      return { provider, embedUrl: `https://player.vimeo.com/video/${id}` };
    }

    if (provider === "twitch") {
      const parent = encodeURIComponent(getTwitchParent());
      const parts = path.split("/").filter(Boolean);
      const videosIdx = parts.findIndex((p) => p === "videos");
      if (videosIdx >= 0 && parts[videosIdx + 1]) {
        return {
          provider,
          embedUrl: `https://player.twitch.tv/?video=${encodeURIComponent(
            parts[videosIdx + 1]
          )}&parent=${parent}&autoplay=true`,
        };
      }
      const channel = parts[0];
      if (!channel) return null;
      return {
        provider,
        embedUrl: `https://player.twitch.tv/?channel=${encodeURIComponent(
          channel
        )}&parent=${parent}&autoplay=true`,
      };
    }

    if (provider === "streamable") {
      // streamable.com/ID → streamable.com/e/ID
      const parts = path.split("/").filter(Boolean);
      const id = parts[0] === "e" ? parts[1] : parts[0];
      if (!id) return null;
      return { provider, embedUrl: `https://streamable.com/e/${id}` };
    }

    // sportdeutschland, sporteurope, generic — URL is already embeddable
    return { provider, embedUrl: abs };
  } catch {
    return null;
  }
}

/**
 * Extract the first usable URL from a liveFeedUrl property.
 * Handles: array of link objects, single link object, plain string.
 */
export function resolveLiveFeedUrl(raw: unknown): string {
  if (!raw) return "";

  // Array of link objects: [{ url, name, target }, ...]
  if (Array.isArray(raw)) {
    const first = raw[0] as Record<string, unknown> | undefined;
    return typeof first?.url === "string" ? first.url : "";
  }

  // Single link object: { url, name, target }
  if (typeof raw === "object") {
    const link = raw as Record<string, unknown>;
    return typeof link.url === "string" ? link.url : "";
  }

  // Plain string
  return typeof raw === "string" ? raw : "";
}
