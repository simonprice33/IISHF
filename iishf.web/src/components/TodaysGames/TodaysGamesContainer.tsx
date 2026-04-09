"use client";

import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { proxyMediaUrl } from "@/lib/umbracoTypes";
import styles from "./TodaysGames.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type GameDto = {
  gameId: string;
  gameNumber: number;
  group: string;
  scheduleDateTime: string;
  homeTeam: string;
  homeLogo: string;
  homeScore: number | null;
  awayTeam: string;
  awayLogo: string;
  awayScore: number | null;
  remarks: string;
};

type EventGamesDto = {
  eventName: string;
  eventPath: string;
  games: GameDto[];
};

// Live score override keyed by gameNumber (as string, matching SignalR payload)
type ScoreMap = Record<string, { home: number; away: number }>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TodaysGamesContainer() {
  const [events, setEvents] = useState<EventGamesDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [scores, setScores] = useState<ScoreMap>({});
  const [updatedGames, setUpdatedGames] = useState<Set<string>>(new Set());

  const hubRef = useRef<signalR.HubConnection | null>(null);
  const hubUrl = process.env.NEXT_PUBLIC_UMBRACO_HUB_URL ?? "http://localhost:32424";

  // ── Fetch initial game data ───────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/todays-games", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: EventGamesDto[] = await res.json();
        setEvents(data);
      } catch (e: unknown) {
        const err = e as { message?: string };
        setError(err?.message ?? "Failed to load games.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── SignalR connection ────────────────────────────────────────────────────
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${hubUrl}/dataHub`, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on("UpdateScores", (gameNumber: string, homeScore: number, awayScore: number) => {
      setScores((prev) => ({
        ...prev,
        [gameNumber]: { home: homeScore, away: awayScore },
      }));
      // Flash the updated game card for 1.5s
      setUpdatedGames((prev) => {
        const next = new Set(prev);
        next.add(gameNumber);
        return next;
      });
      setTimeout(() => {
        setUpdatedGames((prev) => {
          const next = new Set(prev);
          next.delete(gameNumber);
          return next;
        });
      }, 1600);
    });

    connection.on("UpdateGamesWithTeams", () => {
      // Reload game data when a schedule refresh is broadcast
      fetch("/api/todays-games", { cache: "no-store" })
        .then((r) => r.json())
        .then((data: EventGamesDto[]) => setEvents(data))
        .catch(() => {/* silently ignore */});
    });

    connection.onreconnected(() => setLiveConnected(true));
    connection.onclose(() => setLiveConnected(false));

    connection
      .start()
      .then(() => setLiveConnected(true))
      .catch(() => setLiveConnected(false));

    hubRef.current = connection;

    return () => {
      connection.stop();
    };
  }, [hubUrl]);

  // ── Render ────────────────────────────────────────────────────────────────

  const today = formatDate(new Date().toISOString());

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Today&apos;s Games</h1>
        <div
          className={`${styles.liveDot} ${liveConnected ? "" : styles.liveDotOffline}`}
          title={liveConnected ? "Live updates connected" : "Live updates offline"}
        />
        <span className={`${styles.liveLabel} ${liveConnected ? "" : styles.liveLabelOffline}`}>
          {liveConnected ? "Live" : "Connecting…"}
        </span>
      </div>

      <p style={{ color: "#64748b", marginBottom: "1.5rem", marginTop: 0 }}>{today}</p>

      {/* Loading */}
      {loading && (
        <div className={styles.emptyState}>
          <div className={styles.spinner} />
          Loading today&apos;s games…
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className={styles.emptyState}>
          ⚠️ {error}
        </div>
      )}

      {/* No games */}
      {!loading && !error && events.length === 0 && (
        <div className={styles.emptyState}>
          No games scheduled for today.
        </div>
      )}

      {/* Events with games */}
      {!loading && !error && events.map((ev) => (
        <div key={ev.eventName} className={styles.eventBlock}>
          <h2 className={styles.eventName}>{ev.eventName}</h2>

          <div className={styles.gamesList}>
            {ev.games.map((game) => {
              const key = String(game.gameNumber);
              const liveScore = scores[key];
              const homeScore = liveScore ? liveScore.home : game.homeScore;
              const awayScore = liveScore ? liveScore.away : game.awayScore;
              const isUpdated = updatedGames.has(key);

              const badgeParts = [
                game.group ? `Group: ${game.group}` : null,
                `Game ${game.gameNumber}`,
                formatTime(game.scheduleDateTime),
              ].filter(Boolean).join(" · ");

              const homeLogo = proxyMediaUrl(game.homeLogo);
              const awayLogo = proxyMediaUrl(game.awayLogo);

              return (
                <div
                  key={game.gameId}
                  className={`${styles.gameCard} ${isUpdated ? styles.gameCardUpdated : ""}`}
                >
                  {badgeParts && (
                    <div className={styles.gameBadge}>{badgeParts}</div>
                  )}

                  <div className={styles.gameRow}>
                    {/* Home logo */}
                    <div className={styles.gameHomeLogo}>
                      {homeLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={homeLogo} alt={game.homeTeam} className={styles.gameTeamLogo} />
                      ) : (
                        <div className={styles.gameLogoPlaceholder} />
                      )}
                    </div>

                    {/* Home name */}
                    <div className={styles.gameHomeName}>{game.homeTeam}</div>

                    {/* Home score */}
                    <div className={styles.gameHomeScore}>
                      {homeScore !== null && homeScore !== undefined ? homeScore : "–"}
                    </div>

                    {/* VS */}
                    <div className={styles.vsTrapezoid}>vs.</div>

                    {/* Away score */}
                    <div className={styles.gameAwayScore}>
                      {awayScore !== null && awayScore !== undefined ? awayScore : "–"}
                    </div>

                    {/* Away name */}
                    <div className={styles.gameAwayName}>{game.awayTeam}</div>

                    {/* Away logo */}
                    <div className={styles.gameAwayLogo}>
                      {awayLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={awayLogo} alt={game.awayTeam} className={styles.gameTeamLogo} />
                      ) : (
                        <div className={styles.gameLogoPlaceholder} />
                      )}
                    </div>
                  </div>

                  {game.remarks && (
                    <div className={styles.gameRemarks}>{game.remarks}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
