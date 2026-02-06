"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "./LiveStream.module.css";
import type { DeliveryItem } from "@/lib/umbracoTypes";
import { asString } from "@/lib/umbracoTypes";
import { getChildren } from "@/lib/umbracoApi";

type LiveFeedLink = {
  url: string;
  title?: string;
};

type LiveFeedMatch = {
  eventName: string;
  eventPath: string;
  feedStartIso: string;
  feedUrl: string;
  feedTitle?: string;
  provider: string;
  embedUrl: string;
};

function stripSlashes(v: string) {
  return v.replace(/^\/+/, "").replace(/\/+$/, "");
}

function fetchKeyFromRoutePath(routePath?: string): string | null {
  const p = asString(routePath);
  if (!p) return null;
  // route.path is like "/tournaments/european-cups/u19-european-cup/2026/"
  return stripSlashes(p.split("?")[0]);
}

function isSameLocalDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function parseLinkArray(value: unknown): LiveFeedLink[] {
  // Umbraco returns link arrays shaped like:
  // [{ url, title, target, ... }]
  if (!Array.isArray(value)) return [];
  const result: LiveFeedLink[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const anyItem = item as Record<string, unknown>;
    const url = asString(anyItem.url);
    if (!url) continue;

    result.push({
      url,
      title: asString(anyItem.title) ?? undefined,
    });
  }

  return result;
}

function detectProvider(url: string): string {
  const u = url.toLowerCase();

  if (u.includes("youtu.be") || u.includes("youtube.com")) return "youtube";
  if (u.includes("vimeo.com")) return "vimeo";
  if (u.includes("twitch.tv")) return "twitch";
  if (u.includes("sportdeutschland.tv")) return "sportdeutschland";
  if (u.includes("sport-europe") || u.includes("sporteurope")) return "sporteurope";

  // fallback
  return "generic";
}

function getTwitchParentParam(): string {
  // Twitch embed REQUIRES parent=<yourdomain>
  // For localhost dev this is "localhost"
  if (typeof window === "undefined") return "localhost";
  return window.location.hostname || "localhost";
}

function buildEmbedUrl(rawUrl: string): { provider: string; embedUrl: string } | null {
  const provider = detectProvider(rawUrl);

  try {
    // Ensure absolute URL for parsing
    const abs =
      rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
        ? rawUrl
        : `https://${rawUrl}`;

    const url = new URL(abs);
    const host = url.hostname.toLowerCase();
    const path = url.pathname;

    // --- YouTube ---
    if (provider === "youtube") {
      // youtu.be/<id>
      if (host.includes("youtu.be")) {
        const id = path.split("/").filter(Boolean)[0];
        if (!id) return null;
        return { provider, embedUrl: `https://www.youtube.com/embed/${id}` };
      }

      // youtube.com/watch?v=<id>
      if (host.includes("youtube.com")) {
        const v = url.searchParams.get("v");
        if (v) return { provider, embedUrl: `https://www.youtube.com/embed/${v}` };

        // youtube.com/embed/<id>
        const parts = path.split("/").filter(Boolean);
        const embedIdx = parts.findIndex((p) => p === "embed");
        if (embedIdx >= 0 && parts[embedIdx + 1]) {
          return { provider, embedUrl: `https://www.youtube.com/embed/${parts[embedIdx + 1]}` };
        }
      }
    }

    // --- Vimeo ---
    if (provider === "vimeo") {
      // vimeo.com/<id> or player.vimeo.com/video/<id>
      const parts = path.split("/").filter(Boolean);
      const id =
        parts.includes("video")
          ? parts[parts.indexOf("video") + 1]
          : parts[0];

      if (!id) return null;
      return { provider, embedUrl: `https://player.vimeo.com/video/${id}` };
    }

    // --- Twitch ---
    if (provider === "twitch") {
      const parent = encodeURIComponent(getTwitchParentParam());
      const parts = path.split("/").filter(Boolean);

      // twitch.tv/videos/<vodId>
      const videosIdx = parts.findIndex((p) => p === "videos");
      if (videosIdx >= 0 && parts[videosIdx + 1]) {
        const vodId = parts[videosIdx + 1];
        return {
          provider,
          embedUrl: `https://player.twitch.tv/?video=${encodeURIComponent(vodId)}&parent=${parent}&autoplay=true`,
        };
      }

      // twitch.tv/<channel>
      const channel = parts[0];
      if (!channel) return null;

      return {
        provider,
        embedUrl: `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${parent}&autoplay=true`,
      };
    }

    // --- SportDeutschland / SportEurope ---
    // These typically already provide embeddable pages or embed URLs
    if (provider === "sportdeutschland" || provider === "sporteurope") {
      return { provider, embedUrl: abs };
    }

    // Fallback: just iframe the URL (works for some providers, not all)
    return { provider, embedUrl: abs };
  } catch {
    return null;
  }
}

function getRoutePath(item: DeliveryItem): string {
  return asString(item.route?.path) ?? "";
}

function getLastRouteSegment(item: DeliveryItem): string | null {
  const p = getRoutePath(item);
  if (!p) return null;
  const segs = p.split("?")[0].split("/").filter(Boolean);
  return segs.length ? segs[segs.length - 1] : null;
}

function looksLikeYearNode(item: DeliveryItem, year: number): boolean {
  const name = asString(item.name)?.trim();
  if (name === String(year)) return true;

  const last = getLastRouteSegment(item);
  return last === String(year);
}

function extractFirstLiveFeedForToday(events: DeliveryItem[], today: Date): LiveFeedMatch | null {
  for (const ev of events) {
    const feedStartIso = asString(ev.properties?.liveFeedDateTime);
    if (!feedStartIso) continue;

    const feedStart = new Date(feedStartIso);
    if (Number.isNaN(feedStart.getTime())) continue;

    // IMPORTANT: your Razor behaviour sounded like "show if it's on the given day"
    if (!isSameLocalDate(feedStart, today)) continue;

    const links = parseLinkArray(ev.properties?.liveFeedUrl);
    if (!links.length) continue;

    // For now: take the first link (single feed scenario)
    const link = links[0];
    const built = buildEmbedUrl(link.url);
    if (!built) continue;

    return {
      eventName: asString(ev.name) ?? "Live stream",
      eventPath: getRoutePath(ev),
      feedStartIso,
      feedUrl: link.url,
      feedTitle: link.title,
      provider: built.provider,
      embedUrl: built.embedUrl,
    };
  }

  return null;
}

export function LiveStreamContainer() {
  const [match, setMatch] = useState<LiveFeedMatch | null>(null);
  const [status, setStatus] = useState<string>("");

  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setStatus("Searching tournaments for today's live feed...");

        // 1) Get tournaments groups (European Cups / European Championships / None Title Events)
        const tournamentGroups = await getChildren("tournaments", 500, false);

        const currentYear = new Date().getFullYear();

        // 2) For each group, traverse down to current year then events
        for (const group of tournamentGroups) {
          const groupKey = fetchKeyFromRoutePath(group.route?.path);
          if (!groupKey) continue;

          setStatus(`Checking: ${group.name}...`);

          // group contains competitions (e.g. U13 European Cup, etc)
          const competitions = await getChildren(groupKey, 500, false);

          for (const comp of competitions) {
            const compKey = fetchKeyFromRoutePath(comp.route?.path);
            if (!compKey) continue;

            // comp contains year folders
            const yearNodes = await getChildren(compKey, 500, false);
            const yearNode = yearNodes.find((x) => looksLikeYearNode(x, currentYear));
            if (!yearNode) continue;

            const yearKey = fetchKeyFromRoutePath(yearNode.route?.path);
            if (!yearKey) continue;

            // year contains event nodes
            const events = await getChildren(yearKey, 500, false);

            const found = extractFirstLiveFeedForToday(events, new Date());
            console.log("LiveStreamContainer: checking", group.name, comp.name, "-> found match?", !!found);
            console.log(found)
            if (found) {
              if (!cancelled) {
                setMatch(found);
                setStatus("");
              }
              return;
            }
          }
        }

        if (!cancelled) {
          setMatch(null);
          setStatus("No live feed found for today.");
        }
      } catch (e) {
        console.error("LiveStreamContainer load failed", e);
        if (!cancelled) {
          setMatch(null);
          setStatus("Failed to load live feed.");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [now]);

  if (!match) {
    // Keep the section hidden if no stream
    return status ? <div className={styles.debug}>{status}</div> : null;
  }

  return (
    <section className={styles.wrap} aria-label="Live stream">
      <div className={styles.inner}>
        <div className={styles.header}>
          <div className={styles.kicker}>Live stream</div>
          <div className={styles.title}>{match.eventName}</div>
          <div className={styles.meta}>
            {new Date(match.feedStartIso).toLocaleString()} • {match.provider}
          </div>
        </div>

        <div className={styles.player}>
          <iframe
            src={match.embedUrl}
            title="Live stream player"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>

        <div className={styles.footer}>
          <a className={styles.link} href={match.feedUrl} target="_blank" rel="noreferrer">
            Open stream
          </a>
          <a className={styles.linkMuted} href={match.eventPath || "#"}>
            View event
          </a>
        </div>
      </div>
    </section>
  );
}
