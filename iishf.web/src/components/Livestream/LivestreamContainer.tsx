
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import styles from "./LiveStream.module.css";
import type { DeliveryItem } from "@/lib/umbracoTypes";
import { asString } from "@/lib/umbracoTypes";
import { getChildren } from "@/lib/umbracoApi";

type LiveFeedLink = {
  url: string;
  title?: string;
};

type LiveFeedMatch = {
  id: string;  // NEW: Added unique ID for React key
  eventName: string;
  eventPath: string;
  feedStartIso: string;
  feedUrl: string;
  feedTitle?: string;
  provider: string;
  embedUrl: string;
};

// NEW: Constant for max visible feeds
const MAX_VISIBLE_FEEDS = 3;

// ============================================
// UNCHANGED: All helper functions below remain the same
// - stripSlashes
// - fetchKeyFromRoutePath
// - isSameLocalDate
// - parseLinkArray
// - detectProvider
// - getTwitchParentParam
// - buildEmbedUrl
// - getRoutePath
// - getLastRouteSegment
// - looksLikeYearNode
// ============================================

function stripSlashes(v: string) {
  return v.replace(/^\/+/, "").replace(/\/+$/, "");
}

function fetchKeyFromRoutePath(routePath?: string): string | null {
  const p = asString(routePath);
  if (!p) return null;
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
  return "generic";
}

function getTwitchParentParam(): string {
  if (typeof window === "undefined") return "localhost";
  return window.location.hostname || "localhost";
}

function buildEmbedUrl(rawUrl: string): { provider: string; embedUrl: string } | null {
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
      if (host.includes("youtu.be")) {
        const id = path.split("/").filter(Boolean)[0];
        if (!id) return null;
        return { provider, embedUrl: `https://www.youtube.com/embed/${id}` };
      }
      if (host.includes("youtube.com")) {
        const v = url.searchParams.get("v");
        if (v) return { provider, embedUrl: `https://www.youtube.com/embed/${v}` };
        const parts = path.split("/").filter(Boolean);
        const embedIdx = parts.findIndex((p) => p === "embed");
        if (embedIdx >= 0 && parts[embedIdx + 1]) {
          return { provider, embedUrl: `https://www.youtube.com/embed/${parts[embedIdx + 1]}` };
        }
      }
    }

    if (provider === "vimeo") {
      const parts = path.split("/").filter(Boolean);
      const id = parts.includes("video") ? parts[parts.indexOf("video") + 1] : parts[0];
      if (!id) return null;
      return { provider, embedUrl: `https://player.vimeo.com/video/${id}` };
    }

    if (provider === "twitch") {
      const parent = encodeURIComponent(getTwitchParentParam());
      const parts = path.split("/").filter(Boolean);
      const videosIdx = parts.findIndex((p) => p === "videos");
      if (videosIdx >= 0 && parts[videosIdx + 1]) {
        const vodId = parts[videosIdx + 1];
        return {
          provider,
          embedUrl: `https://player.twitch.tv/?video=${encodeURIComponent(vodId)}&parent=${parent}&autoplay=true`,
        };
      }
      const channel = parts[0];
      if (!channel) return null;
      return {
        provider,
        embedUrl: `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${parent}&autoplay=true`,
      };
    }

    if (provider === "sportdeutschland" || provider === "sporteurope") {
      return { provider, embedUrl: abs };
    }

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

// ============================================
// CHANGED: Renamed from extractFirstLiveFeedForToday to extractAllLiveFeedsForToday
// Now returns ALL feeds for today instead of just the first one
// ============================================
function extractAllLiveFeedsForToday(events: DeliveryItem[], today: Date): LiveFeedMatch[] {
  const feeds: LiveFeedMatch[] = [];  // CHANGED: Now an array instead of single return

  for (const ev of events) {
    const feedStartIso = asString(ev.properties?.liveFeedDateTime);
    if (!feedStartIso) continue;

    const feedStart = new Date(feedStartIso);
    if (Number.isNaN(feedStart.getTime())) continue;

    if (!isSameLocalDate(feedStart, today)) continue;

    const links = parseLinkArray(ev.properties?.liveFeedUrl);
    if (!links.length) continue;

    const link = links[0];
    const built = buildEmbedUrl(link.url);
    if (!built) continue;

    // CHANGED: Push to array instead of returning immediately
    feeds.push({
      id: asString(ev.id) ?? feedStartIso,  // NEW: Added id field
      eventName: asString(ev.name) ?? "Live stream",
      eventPath: getRoutePath(ev),
      feedStartIso,
      feedUrl: link.url,
      feedTitle: link.title,
      provider: built.provider,
      embedUrl: built.embedUrl,
    });
  }

  // NEW: Sort feeds by start time
  feeds.sort((a, b) => new Date(a.feedStartIso).getTime() - new Date(b.feedStartIso).getTime());

  return feeds;
}

// ============================================
// NEW: Function to calculate which feeds should be visible based on current time
// ============================================
function getVisibleFeeds(allFeeds: LiveFeedMatch[], now: Date): LiveFeedMatch[] {
  const nowTime = now.getTime();
  const upcomingOrCurrent: LiveFeedMatch[] = [];

  for (let i = 0; i < allFeeds.length; i++) {
    const feed = allFeeds[i];
    const feedStart = new Date(feed.feedStartIso).getTime();
    const nextFeed = allFeeds[i + 1];
    const nextStart = nextFeed ? new Date(nextFeed.feedStartIso).getTime() : Infinity;

    // Include if feed hasn't started OR is currently playing (next hasn't started)
    if (feedStart > nowTime || (feedStart <= nowTime && nextStart > nowTime)) {
      upcomingOrCurrent.push(feed);
    }
  }

  return upcomingOrCurrent.slice(0, MAX_VISIBLE_FEEDS);
}

export function LiveStreamContainer() {
  // CHANGED: Now tracking allFeeds and visibleFeeds separately
  const [allFeeds, setAllFeeds] = useState<LiveFeedMatch[]>([]);
  const [visibleFeeds, setVisibleFeeds] = useState<LiveFeedMatch[]>([]);
  const [status, setStatus] = useState<string>("");
  
  // NEW: Track current time for auto-rotation
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // NEW: Timer to update current time every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // NEW: Recalculate visible feeds when time or allFeeds changes
  useEffect(() => {
    if (allFeeds.length > 0) {
      const visible = getVisibleFeeds(allFeeds, currentTime);
      setVisibleFeeds(visible);
    }
  }, [allFeeds, currentTime]);

  // CHANGED: Load function now collects ALL feeds instead of stopping at first
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setStatus("Searching tournaments for today's live feeds...");

        const tournamentGroups = await getChildren("tournaments", 500, false);
        const currentYear = new Date().getFullYear();
        const today = new Date();
        const foundFeeds: LiveFeedMatch[] = [];  // NEW: Collect all feeds

        for (const group of tournamentGroups) {
          const groupKey = fetchKeyFromRoutePath(group.route?.path);
          if (!groupKey) continue;

          setStatus(`Checking: ${group.name}...`);

          const competitions = await getChildren(groupKey, 500, false);

          for (const comp of competitions) {
            const compKey = fetchKeyFromRoutePath(comp.route?.path);
            if (!compKey) continue;

            const yearNodes = await getChildren(compKey, 500, false);
            const yearNode = yearNodes.find((x) => looksLikeYearNode(x, currentYear));
            if (!yearNode) continue;

            const yearKey = fetchKeyFromRoutePath(yearNode.route?.path);
            if (!yearKey) continue;

            const events = await getChildren(yearKey, 500, false);
            console.log(`Checking ${events.length} events in ${group.name} / ${comp.name} for live feeds...`);
            console.log(events);
            // CHANGED: Get ALL feeds and add to array (was: return on first find)
            const feeds = extractAllLiveFeedsForToday(events, today);
            foundFeeds.push(...feeds);
          }
        }

        if (!cancelled) {
          // NEW: Sort and set all feeds
          foundFeeds.sort((a, b) => 
            new Date(a.feedStartIso).getTime() - new Date(b.feedStartIso).getTime()
          );
          setAllFeeds(foundFeeds);
          setStatus(foundFeeds.length === 0 ? "No live feeds found for today." : "");
        }
      } catch (e) {
        console.error("LiveStreamContainer load failed", e);
        if (!cancelled) {
          setAllFeeds([]);
          setStatus("Failed to load live feeds.");
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

// //   // CHANGED: Check visibleFeeds instead of single match
// //   if (visibleFeeds.length === 0) {
// //     return status ? <div className={styles.debug}>{status}</div> : null;
// //   }

// //   // ============================================
// //   // CHANGED: Entire render section rewritten for multiple feeds
// //   // ============================================
// //   return (
// //     <section className={styles.wrap} aria-label="Live streams">
// //       <div className={styles.inner}>
// //         {/* CHANGED: Simplified header */}
// //         <div className={styles.header}>
// //           <div className={styles.kicker}>Live Streams</div>
// //           <div className={styles.title}>
// //             IISHF <span className={styles.orange}>Live</span> Feed
// //           </div>
// //         </div>

// //         {/* NEW: Grid container for multiple feeds */}
// //         <div className={styles.feedGrid}>
// //           {visibleFeeds.map((feed) => (
// //             <div key={feed.id} className={styles.feedCard}>
// //               <div className={styles.feedHeader}>
// //                 <div className={styles.feedName}>{feed.eventName}</div>
// //                 <div className={styles.feedMeta}>
// //                   {new Date(feed.feedStartIso).toLocaleTimeString([], { 
// //                     hour: '2-digit', 
// //                     minute: '2-digit' 
// //                   })} CET • {feed.provider}
// //                 </div>
// //               </div>

// //               <div className={styles.player}>
// //                 <iframe
// //                   src={feed.embedUrl}
// //                   title={`Live stream - ${feed.eventName}`}
// //                   allow="autoplay; fullscreen; picture-in-picture"
// //                   allowFullScreen
// //                   loading="lazy"
// //                 />
// //               </div>

// //               <div className={styles.feedFooter}>
// //                 <a className={styles.link} href={feed.feedUrl} target="_blank" rel="noreferrer">
// //                   Open
// //                 </a>
// //                 <a className={styles.linkMuted} href={feed.eventPath || "#"}>
// //                   Event
// //                 </a>
// //               </div>
// //             </div>
// //           ))}
// //         </div>

// //         {/* NEW: Feed counter */}
// //         {allFeeds.length > MAX_VISIBLE_FEEDS && (
// //           <div className={styles.feedCount}>
// //             Showing {visibleFeeds.length} of {allFeeds.length} feeds today
// //           </div>
// //         )}
// //       </div>
// //     </section>
// //   );

// NO FEEDS: Show section with "no feeds" message
  if (visibleFeeds.length === 0) {
    return (
      <section className={styles.wrap} aria-label="Live streams">
        <div className={styles.inner}>
          <div className={styles.header}>
            <div className={styles.kicker}>Live Streams</div>
            <div className={styles.title}>
              IISHF <span className={styles.orange}>Live</span> Feed
            </div>
          </div>

          <div className={styles.noFeedsContainer}>
            <div className={styles.noFeedsMessage}>
              No video feeds are currently available for this event
            </div>
          </div>

          {status && <div className={styles.debug}>{status}</div>}
        </div>
      </section>
    );
  }

  // SINGLE FEED: Show larger layout (original style)
  if (visibleFeeds.length === 1) {
    const feed = visibleFeeds[0];
    return (
      <section className={styles.wrap} aria-label="Live stream">
        <div className={styles.inner}>
          <div className={styles.header}>
            <div className={styles.kicker}>Live Stream</div>
            <div className={styles.title}>{feed.eventName}</div>
            <div className={styles.meta}>
              {new Date(feed.feedStartIso).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })} CET • {feed.provider}
            </div>
          </div>

          <div className={styles.playerLarge}>
            <iframe
              src={feed.embedUrl}
              title="Live stream player"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>

          <div className={styles.footer}>
            <a className={styles.link} href={feed.feedUrl} target="_blank" rel="noreferrer">
              Open stream
            </a>
            <a className={styles.linkMuted} href={feed.eventPath || "#"}>
              View event
            </a>
          </div>
        </div>
      </section>
    );
  }

  // MULTIPLE FEEDS: Show grid layout (2-3 feeds)
  return (
    <section className={styles.wrap} aria-label="Live streams">
      <div className={styles.inner}>
        <div className={styles.header}>
          <div className={styles.kicker}>Live Streams</div>
          <div className={styles.title}>
            IISHF <span className={styles.orange}>Live</span> Feed
          </div>
        </div>

        <div className={styles.feedGrid}>
          {visibleFeeds.map((feed) => (
            <div key={feed.id} className={styles.feedCard}>
              <div className={styles.feedHeader}>
                <div className={styles.feedName}>{feed.eventName}</div>
                <div className={styles.feedMeta}>
                  {new Date(feed.feedStartIso).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })} CET • {feed.provider}
                </div>
              </div>

              <div className={styles.player}>
                <iframe
                  src={feed.embedUrl}
                  title={`Live stream - ${feed.eventName}`}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>

              <div className={styles.feedFooter}>
                <a className={styles.link} href={feed.feedUrl} target="_blank" rel="noreferrer">
                  Open
                </a>
                <a className={styles.linkMuted} href={feed.eventPath || "#"}>
                  Event
                </a>
              </div>
            </div>
          ))}
        </div>

        {allFeeds.length > MAX_VISIBLE_FEEDS && (
          <div className={styles.feedCount}>
            Showing {visibleFeeds.length} of {allFeeds.length} feeds today
          </div>
        )}
      </div>
    </section>
  );
}