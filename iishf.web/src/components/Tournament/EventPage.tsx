"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHero } from "@/components/PageHero/PageHero";
import type { DeliveryItem } from "@/lib/umbracoTypes";
import { proxyMediaUrl, extractLink, asString } from "@/lib/umbracoTypes";
import { buildEmbedUrl, resolveLiveFeedUrl } from "@/lib/embedUtils";
import styles from "./EventPage.module.css";

// ─── Shared data types ────────────────────────────────────────────────────────

export type RosterData = {
  teamId: string;
  teamName: string;
  teamLogoUrl?: string;
  players: DeliveryItem[];
};

type Props = {
  page: DeliveryItem;
  years: DeliveryItem[];
  selectedYear: string;
  selectedEvent: DeliveryItem | null;
  teams: DeliveryItem[];
  games: DeliveryItem[];
  liveFeeds: DeliveryItem[];
  documents: DeliveryItem[];
  rosters: RosterData[];
};

// ─── ISO 3166-1 alpha-3 → country name ───────────────────────────────────────

const ISO3_NAMES: Record<string, string> = {
  AFG: "Afghanistan", ALB: "Albania", DZA: "Algeria", AND: "Andorra",
  ARG: "Argentina", ARM: "Armenia", AUS: "Australia", AUT: "Austria",
  AZE: "Azerbaijan", BLR: "Belarus", BEL: "Belgium", BIH: "Bosnia & Herzegovina",
  BRA: "Brazil", BGR: "Bulgaria", CAN: "Canada", CHN: "China",
  HRV: "Croatia", CYP: "Cyprus", CZE: "Czech Republic", DNK: "Denmark",
  EST: "Estonia", FIN: "Finland", FRA: "France", GEO: "Georgia",
  DEU: "Germany", GRC: "Greece", HUN: "Hungary", ISL: "Iceland",
  IND: "India", IRL: "Ireland", ISR: "Israel", ITA: "Italy",
  JPN: "Japan", KAZ: "Kazakhstan", KOR: "South Korea", LVA: "Latvia",
  LIE: "Liechtenstein", LTU: "Lithuania", LUX: "Luxembourg", MLT: "Malta",
  MDA: "Moldova", MCO: "Monaco", MNE: "Montenegro", NLD: "Netherlands",
  NZL: "New Zealand", MKD: "North Macedonia", NOR: "Norway", POL: "Poland",
  PRT: "Portugal", ROU: "Romania", RUS: "Russia", SMR: "San Marino",
  SRB: "Serbia", SVK: "Slovakia", SVN: "Slovenia", ESP: "Spain",
  SWE: "Sweden", CHE: "Switzerland", TUR: "Turkey", UKR: "Ukraine",
  GBR: "Great Britain", USA: "United States", UZB: "Uzbekistan",
};

function isoToName(iso: string): string {
  return ISO3_NAMES[iso.toUpperCase()] ?? iso;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function num(v: unknown): number {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

function placementClass(place: number): string {
  if (place === 1) return styles.gold;
  if (place === 2) return styles.silver;
  if (place === 3) return styles.bronze;
  return styles.placementRow;
}

function toOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatDateTime(iso: unknown): string {
  const s = asString(iso);
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateRange(start: unknown, end: unknown): string {
  const s = asString(start);
  const e = asString(end);
  if (!s || !e) return "";
  const sd = new Date(s);
  const ed = new Date(e);
  if (isNaN(sd.getTime()) || isNaN(ed.getTime())) return "";
  const startStr = sd.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
  });
  const endStr = ed.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${startStr} - ${endStr}`;
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabId =
  | "info"
  | "teams"
  | "standings"
  | "schedule"
  | "placements"
  | "stats"
  | "media"
  | "documents";

// ─── Main component ───────────────────────────────────────────────────────────

export function EventPage({
  page,
  years,
  selectedYear,
  selectedEvent,
  teams,
  games,
  liveFeeds,
  documents,
  rosters,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("info");

  const heroImage = proxyMediaUrl(page.properties?.heroImage);
  const heroTitle = asString(page.properties?.heroTitle) || page.name;

  // Determine which tabs are visible
  const showTeams = teams.length > 0;
  const showSchedule = games.length > 0;
  const showPlacements = teams.some(
    (t) => num(t.properties?.finalRanking) > 0
  );
  const showStats = rosters.some((r) => r.players.length > 0);
  const showMedia = true;
  const showDocuments = documents.length > 0;

  const allTabs: { id: TabId; label: string; visible: boolean }[] = [
    { id: "info", label: "Tournament Information", visible: true },
    { id: "teams", label: "Teams", visible: showTeams },
    { id: "standings", label: "Group Standings", visible: showTeams },
    { id: "schedule", label: "Schedule and Results", visible: showSchedule },
    { id: "placements", label: "Final Placements", visible: true },
    { id: "stats", label: "Player Statistics", visible: showStats },
    { id: "media", label: "Media", visible: showMedia },
    { id: "documents", label: "Documents", visible: showDocuments },
  ];
  const tabs = allTabs.filter((t) => t.visible);

  return (
    <>
      <PageHero title={heroTitle} imageUrl={heroImage} />

      <div className={styles.wrapper}>
        {/* Year selector */}
        <div className={styles.yearRow}>
          {years.map((y) => {
            const active = y.name === selectedYear;
            const path = page.route?.path ?? "#";
            return (
              <Link
                key={y.id}
                href={`${path}?year=${y.name}`}
                className={`${styles.yearBadge} ${active ? styles.yearActive : styles.yearInactive}`}
              >
                {y.name}
              </Link>
            );
          })}
        </div>

        {!selectedEvent ? (
          <div className={styles.card}>
            <h2 className={styles.tabHeading}>
              There is currently no data available for this event.
            </h2>
          </div>
        ) : (
          <div className={styles.layout}>
            {/* Sidebar tab nav */}
            <nav className={styles.tabNav}>
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`${styles.tabBtn} ${activeTab === t.id ? styles.tabBtnActive : ""}`}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            {/* Tab content */}
            <div className={styles.card}>
              {activeTab === "info" && (
                <TournamentInfoTab event={selectedEvent} />
              )}
              {activeTab === "teams" && <TeamsTab teams={teams} />}
              {activeTab === "standings" && <StandingsTab teams={teams} />}
              {activeTab === "schedule" && (
                <ScheduleTab games={games} teams={teams} />
              )}
              {activeTab === "placements" && (
                <PlacementsTab teams={teams} />
              )}
              {activeTab === "stats" && <PlayerStatsTab rosters={rosters} />}
              {activeTab === "media" && <MediaTab liveFeeds={liveFeeds} />}
              {activeTab === "documents" && (
                <DocumentsTab documents={documents} />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Tournament Information Tab ───────────────────────────────────────────────

function TournamentInfoTab({ event }: { event: DeliveryItem }) {
  const p = event.properties ?? {};
  const hostLogoUrl = proxyMediaUrl(p.hostImage);
  const hostWebsite = extractLink(p.hostWebSite);
  const startDate = asString(p.eventStartDate);
  const endDate = asString(p.eventEndDate);
  const dateRange = formatDateRange(startDate, endDate);
  const phone = asString(p.hostPhoneNumber);
  const email = asString(p.hostEmail);
  const venueName = asString(p.venueName);
  const venueAddress = asString(p.venueAddress);
  const rinkLength = asString(p.rinkSizeLength);
  const rinkWidth = asString(p.rinkSizeWidth);
  const rinkFloor = asString(p.rinkFloor);

  return (
    <div>
      <h2 className={styles.tabHeading}>Tournament Information</h2>
      {dateRange && <h3 className={styles.dateRange}>{dateRange}</h3>}

      <div className={styles.infoGrid}>
        {/* Host */}
        <div className={styles.infoCol}>
          <h4 className={styles.infoColTitle}>Host</h4>
          {hostLogoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hostLogoUrl} alt="Host" className={styles.hostImg} />
          )}
          {asString(p.hostClub) && (
            <strong className={styles.infoLine}>{asString(p.hostClub)}</strong>
          )}
          {asString(p.hostContact) && (
            <span className={styles.infoLine}>{asString(p.hostContact)}</span>
          )}
          <div className={styles.iconRow}>
            {hostWebsite && (
              <a href={hostWebsite.url} target={hostWebsite.target ?? "_blank"} rel="noopener noreferrer" className={styles.iconLink} title="Website">
                🌐
              </a>
            )}
            {phone && (
              <>
                <a href={`tel:${phone.replace(/\s/g, "")}`} className={styles.iconLink} title="Phone">
                  📞
                </a>
                <a
                  href={`https://wa.me/${phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.iconLink}
                  title="WhatsApp"
                >
                  💬
                </a>
              </>
            )}
            {email && (
              <a href={`mailto:${email}`} className={styles.iconLink} title="Email">
                ✉️
              </a>
            )}
          </div>
        </div>

        {/* Venue */}
        <div className={styles.infoCol}>
          <h4 className={styles.infoColTitle}>Venue</h4>
          {venueName && <strong className={styles.infoLine}>{venueName}</strong>}
          {venueAddress && (
            <span
              className={styles.infoLine}
              dangerouslySetInnerHTML={{
                __html: venueAddress.replace(/\n/g, "<br/>"),
              }}
            />
          )}
        </div>

        {/* Rink */}
        <div className={styles.infoCol}>
          <h4 className={styles.infoColTitle}>Rink Features</h4>
          {(rinkLength || rinkWidth) && (
            <>
              <strong className={styles.infoLine}>Dimensions</strong>
              <span className={styles.infoLine}>
                {rinkLength} X {rinkWidth}
              </span>
            </>
          )}
          {rinkFloor && (
            <>
              <strong className={styles.infoLine}>Flooring</strong>
              <span className={styles.infoLine}>{rinkFloor}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Teams Tab ────────────────────────────────────────────────────────────────

function TeamsTab({ teams }: { teams: DeliveryItem[] }) {
  return (
    <div>
      <h2 className={styles.tabHeading}>Teams</h2>
      <div className={styles.teamsGrid}>
        {teams.map((team) => {
          const logoUrl = proxyMediaUrl(team.properties?.image);
          const website = extractLink(team.properties?.teamWebsite);
          return (
            <div key={team.id} className={styles.teamCard}>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={team.name} className={styles.teamLogo} />
              ) : (
                <div className={styles.teamLogoPlaceholder} />
              )}
              <h5 className={styles.teamName}>{team.name}</h5>
              {website && (
                <a href={website.url} target={website.target ?? "_blank"} rel="noopener noreferrer" className={styles.teamWebLink}>
                  🌐
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Group Standings Tab ──────────────────────────────────────────────────────

function StandingsTab({ teams }: { teams: DeliveryItem[] }) {
  if (teams.length === 0) {
    return (
      <div>
        <h2 className={styles.tabHeading}>Standings</h2>
        <p className={styles.empty}>Awaiting Group Information</p>
      </div>
    );
  }

  // Group teams by their group property
  const grouped = new Map<string, DeliveryItem[]>();
  for (const team of teams) {
    const g = asString(team.properties?.group) ?? "";
    if (!grouped.has(g)) grouped.set(g, []);
    grouped.get(g)!.push(team);
  }

  const sortTeams = (ts: DeliveryItem[]) =>
    [...ts].sort((a, b) => {
      const ap = a.properties ?? {};
      const bp = b.properties ?? {};
      const placeDiff = num(ap.groupPlacement) - num(bp.groupPlacement);
      if (placeDiff !== 0) return placeDiff;
      const ptsDiff = num(bp.points) - num(ap.points);
      if (ptsDiff !== 0) return ptsDiff;
      const twDiff = num(bp.tiedWeight) - num(ap.tiedWeight);
      if (twDiff !== 0) return twDiff;
      const wDiff = num(bp.wins) - num(ap.wins);
      if (wDiff !== 0) return wDiff;
      const gfDiff = num(bp.goalsFor) - num(ap.goalsFor);
      if (gfDiff !== 0) return gfDiff;
      return num(bp.difference) - num(ap.difference);
    });

  const groups = [...grouped.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const multiGroup = groups.length > 1;

  return (
    <div>
      <h2 className={styles.tabHeading}>Standings</h2>
      {groups.map(([groupName, groupTeams]) => {
        const sorted = sortTeams(groupTeams);
        return (
          <div key={groupName} className={styles.standingsGroup}>
            {multiGroup && groupName && (
              <h3 className={styles.groupTitle}>Group {groupName}</h3>
            )}

            {/* ── Desktop table ─────────────────────────────────────── */}
            <div className={`${styles.tableWrap} ${styles.standingsDesktop}`}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th>G</th>
                    <th>W</th>
                    <th>L</th>
                    <th>T</th>
                    <th>GF</th>
                    <th>GA</th>
                    <th>+/-</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((team, idx) => {
                    const p = team.properties ?? {};
                    const logoUrl = proxyMediaUrl(p.image);
                    const placement = num(p.groupPlacement) || idx + 1;
                    return (
                      <tr key={team.id}>
                        <td className={styles.tdOrdinal}>{toOrdinal(placement)}</td>
                        {logoUrl ? (
                          <td>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={logoUrl} alt={team.name} className={styles.standingLogo} />
                          </td>
                        ) : (
                          <td />
                        )}
                        <td className={styles.tdTeamName}><strong>{team.name}</strong></td>
                        <td>{asString(p.games) ?? 0}</td>
                        <td>{asString(p.wins) ?? 0}</td>
                        <td>{asString(p.losses) ?? 0}</td>
                        <td>{asString(p.tie) ?? 0}</td>
                        <td>{asString(p.goalsFor) ?? 0}</td>
                        <td>{asString(p.goalsAgainst) ?? 0}</td>
                        <td>{asString(p.difference) ?? 0}</td>
                        <td><strong>{asString(p.points) ?? 0}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile stacked cards ───────────────────────────────── */}
            <div className={styles.standingsMobile}>
              {sorted.map((team, idx) => {
                const p = team.properties ?? {};
                const logoUrl = proxyMediaUrl(p.image);
                const placement = num(p.groupPlacement) || idx + 1;
                const stats: { label: string; value: string; bold?: boolean }[] = [
                  { label: "G",   value: asString(p.games)        ?? "0" },
                  { label: "W",   value: asString(p.wins)         ?? "0" },
                  { label: "L",   value: asString(p.losses)       ?? "0" },
                  { label: "T",   value: asString(p.tie)          ?? "0" },
                  { label: "GF",  value: asString(p.goalsFor)     ?? "0" },
                  { label: "GA",  value: asString(p.goalsAgainst) ?? "0" },
                  { label: "+/-", value: asString(p.difference)   ?? "0" },
                  { label: "Pts", value: asString(p.points)       ?? "0", bold: true },
                ];
                return (
                  <div key={team.id} className={styles.standingCard}>
                    <div className={styles.standingCardHeader}>
                      <span className={styles.standingCardRank}>{toOrdinal(placement)}</span>
                      {logoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt={team.name} className={styles.standingCardLogo} />
                      )}
                      <span className={styles.standingCardName}>{team.name}</span>
                    </div>
                    <div className={styles.standingCardStats}>
                      {stats.map(({ label, value, bold }) => (
                        <div key={label} className={styles.standingCardStat}>
                          <span className={styles.standingCardStatLabel}>{label}</span>
                          <span className={bold ? styles.standingCardStatValueBold : styles.standingCardStatValue}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Schedule & Results Tab ───────────────────────────────────────────────────

function ScheduleTab({
  games,
  teams,
}: {
  games: DeliveryItem[];
  teams: DeliveryItem[];
}) {
  if (games.length === 0) {
    return (
      <div>
        <h2 className={styles.tabHeading}>Schedule and Results</h2>
        <p className={styles.empty}>Schedule pending</p>
      </div>
    );
  }

  // Build team logo lookup by name
  const logoByName = new Map<string, string | undefined>();
  for (const team of teams) {
    logoByName.set(team.name.toLowerCase(), proxyMediaUrl(team.properties?.image));
  }

  const sorted = [...games].sort(
    (a, b) =>
      num(a.properties?.gameNumber) - num(b.properties?.gameNumber)
  );

  return (
    <div>
      <h2 className={styles.tabHeading}>Schedule and Results</h2>
      <div className={styles.gamesList}>
        {sorted.map((game) => {
          const p = game.properties ?? {};
          const homeTeam = asString(p.homeTeam) ?? "";
          const awayTeam = asString(p.awayTeam) ?? "";
          const homeScore = asString(p.homeScore) ?? "";
          const awayScore = asString(p.awayScore) ?? "";
          const gameNum = asString(p.gameNumber) ?? "";
          const group = asString(p.group) ?? "";
          const remarks = asString(p.remarks) ?? "";
          const gameSheetUrl = proxyMediaUrl(p.gameSheet);
          const dt = formatDateTime(p.scheduleDateTime);
          const homeLogo = logoByName.get(homeTeam.toLowerCase());
          const awayLogo = logoByName.get(awayTeam.toLowerCase());

          const badgeText = group.trim()
            ? `Game ${gameNum} - Group: ${group} - ${dt}`
            : `Game ${gameNum}${remarks ? ` - ${remarks}` : ""} - ${dt}`;

          return (
            <div key={game.id} className={styles.gameCard}>
              <div className={styles.gameBadge}>
                {badgeText}
                {gameSheetUrl && (
                  <>
                    {" · "}
                    <a
                      href={gameSheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.gameSheetLink}
                    >
                      View Game Sheet
                    </a>
                  </>
                )}
              </div>

              <div className={styles.gameRow}>
                {/* Home logo */}
                <div className={styles.gameHomeLogo}>
                  {homeLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={homeLogo} alt={homeTeam} className={styles.gameTeamLogo} />
                  ) : (
                    <div className={styles.gameLogoPlaceholder} />
                  )}
                </div>
                {/* Home name */}
                <div className={styles.gameHomeName}>{homeTeam}</div>
                {/* Home score */}
                <div className={styles.gameHomeScore}>{homeScore}</div>

                {/* VS */}
                <div className={styles.vsTrapezoid}>vs.</div>

                {/* Away score */}
                <div className={styles.gameAwayScore}>{awayScore}</div>
                {/* Away name */}
                <div className={styles.gameAwayName}>{awayTeam}</div>
                {/* Away logo */}
                <div className={styles.gameAwayLogo}>
                  {awayLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={awayLogo} alt={awayTeam} className={styles.gameTeamLogo} />
                  ) : (
                    <div className={styles.gameLogoPlaceholder} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Final Placements Tab ─────────────────────────────────────────────────────

function PlacementsTab({ teams }: { teams: DeliveryItem[] }) {
  const placed = teams
    .filter((t) => num(t.properties?.finalRanking) > 0)
    .sort(
      (a, b) =>
        num(a.properties?.finalRanking) - num(b.properties?.finalRanking)
    );

  return (
    <div>
      <h2 className={styles.tabHeading}>Placements</h2>
      {placed.length === 0 ? (
        <p className={styles.empty}>Awaiting result</p>
      ) : (
        <div className={styles.placementsList}>
          {placed.map((team) => {
            const p = team.properties ?? {};
            const rank = num(p.finalRanking);
            const logoUrl = proxyMediaUrl(p.image);
            const iso = asString(p.countryIso3) ?? "";
            return (
              <div key={team.id} className={`${styles.placementRow} ${placementClass(rank)}`}>
                <span className={styles.placementRank}>
                  {toOrdinal(rank)}
                </span>
                <div className={styles.placementInfo}>
                  <span className={styles.placementTeam}>{team.name}</span>
                  <div className={styles.placementLogoRow}>
                    {logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoUrl}
                        alt={team.name}
                        className={styles.placementLogo}
                      />
                    )}
                    {iso && <span className={styles.placementIso}>{isoToName(iso)}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Player Statistics Tab ────────────────────────────────────────────────────

type PlayerRow = {
  teamName: string;
  teamLogoUrl?: string;
  playerName: string;
  goals: number;
  assists: number;
  total: number;
  penalties: number;
  gamesPlayed: number;
};

type PlayerSortKey =
  | "playerName"
  | "teamName"
  | "goals"
  | "assists"
  | "total"
  | "penalties"
  | "gamesPlayed";

function PlayerStatsTab({ rosters }: { rosters: RosterData[] }) {
  const [filterPlayer, setFilterPlayer] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [sortBy, setSortBy] = useState<PlayerSortKey>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const allRows: PlayerRow[] = rosters.flatMap((r) =>
    r.players.map((player) => {
      const pp = player.properties ?? {};
      const goals = num(pp.goals);
      const assists = num(pp.assists);
      const penalties = num(pp.penalties);
      const gamesPlayed = num(pp.gamesPlayed);
      return {
        teamName: r.teamName,
        teamLogoUrl: r.teamLogoUrl,
        playerName: asString(pp.playerName) ?? player.name,
        goals,
        assists,
        total: goals + assists,
        penalties,
        gamesPlayed,
      };
    })
  );

  const teams = [...new Set(allRows.map((r) => r.teamName))].sort();

  const toggleSort = (col: PlayerSortKey) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  const sortIcon = (col: PlayerSortKey) =>
    sortBy !== col ? " ↕" : sortDir === "desc" ? " ↓" : " ↑";

  const rows = allRows
    .filter((r) => !filterTeam || r.teamName === filterTeam)
    .filter(
      (r) =>
        !filterPlayer ||
        r.playerName.toLowerCase().includes(filterPlayer.toLowerCase())
    )
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      const av = a[sortBy];
      const bv = b[sortBy];
      if (typeof av === "number" && typeof bv === "number")
        return mul * (av - bv);
      return mul * String(av).localeCompare(String(bv));
    });

  return (
    <div>
      <h2 className={styles.tabHeading}>Player Statistics</h2>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className={styles.statsFilters}>
        <input
          type="text"
          placeholder="Search player…"
          value={filterPlayer}
          onChange={(e) => setFilterPlayer(e.target.value)}
          className={styles.statsFilterInput}
        />
        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          className={styles.statsFilterSelect}
        >
          <option value="">All Teams</option>
          {teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <p className={styles.empty}>No players match your filters.</p>
      ) : (
        <>
          {/* ── Desktop table ─────────────────────────────────────── */}
          <div className={`${styles.tableWrap} ${styles.standingsDesktop}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th colSpan={2}>
                    <button
                      className={styles.sortBtn}
                      onClick={() => toggleSort("teamName")}
                    >
                      Team{sortIcon("teamName")}
                    </button>
                  </th>
                  <th>
                    <button
                      className={styles.sortBtn}
                      onClick={() => toggleSort("playerName")}
                    >
                      Player Name{sortIcon("playerName")}
                    </button>
                  </th>
                  <th className={styles.tdCenter}>
                    <button
                      className={styles.sortBtn}
                      onClick={() => toggleSort("goals")}
                    >
                      Goals{sortIcon("goals")}
                    </button>
                  </th>
                  <th className={styles.tdCenter}>
                    <button
                      className={styles.sortBtn}
                      onClick={() => toggleSort("assists")}
                    >
                      Assists{sortIcon("assists")}
                    </button>
                  </th>
                  <th className={styles.tdCenter}>
                    <button
                      className={styles.sortBtn}
                      onClick={() => toggleSort("total")}
                    >
                      Total{sortIcon("total")}
                    </button>
                  </th>
                  <th className={styles.tdCenter}>
                    <button
                      className={styles.sortBtn}
                      onClick={() => toggleSort("penalties")}
                    >
                      Penalties{sortIcon("penalties")}
                    </button>
                  </th>
                  <th className={styles.tdCenter}>
                    <button
                      className={styles.sortBtn}
                      onClick={() => toggleSort("gamesPlayed")}
                    >
                      Games Played{sortIcon("gamesPlayed")}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx}>
                    <td>
                      {row.teamLogoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.teamLogoUrl}
                          alt={row.teamName}
                          className={styles.standingLogo}
                        />
                      )}
                    </td>
                    <td className={styles.tdTeamName}>
                      <strong>{row.teamName}</strong>
                    </td>
                    <td>{row.playerName}</td>
                    <td className={styles.tdCenter}>{row.goals}</td>
                    <td className={styles.tdCenter}>{row.assists}</td>
                    <td className={styles.tdCenter}>{row.total}</td>
                    <td className={styles.tdCenter}>{row.penalties}</td>
                    <td className={styles.tdCenter}>{row.gamesPlayed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile stacked cards ───────────────────────────────── */}
          <div className={styles.standingsMobile}>
            {rows.map((row, idx) => {
              const stats: {
                label: string;
                value: string;
                bold?: boolean;
                span?: 2 | 3;
              }[] = [
                { label: "Goals",     value: String(row.goals),        bold: true, span: 2 },
                { label: "Assists",   value: String(row.assists),                  span: 2 },
                { label: "Total",     value: String(row.total),        bold: true, span: 2 },
                { label: "GP",        value: String(row.gamesPlayed),              span: 3 },
                { label: "Penalties", value: String(row.penalties),                span: 3 },
              ];
              return (
                <div key={idx} className={styles.standingCard}>
                  <div className={styles.standingCardHeader}>
                    {row.teamLogoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.teamLogoUrl}
                        alt={row.teamName}
                        className={styles.standingCardLogo}
                      />
                    )}
                    <div className={styles.playerCardMeta}>
                      <span className={styles.standingCardName}>
                        {row.playerName}
                      </span>
                      <span className={styles.playerCardTeam}>
                        {row.teamName}
                      </span>
                    </div>
                  </div>
                  <div className={`${styles.standingCardStats} ${styles.standingCardStatsPlayer}`}>
                    {stats.map(({ label, value, bold, span }) => (
                      <div
                        key={label}
                        className={styles.standingCardStat}
                        style={{ gridColumn: span ? `span ${span}` : undefined }}
                      >
                        <span className={styles.standingCardStatLabel}>
                          {label}
                        </span>
                        <span
                          className={
                            bold
                              ? styles.standingCardStatValueBold
                              : styles.standingCardStatValue
                          }
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Media Tab ────────────────────────────────────────────────────────────────


function MediaTab({ liveFeeds }: { liveFeeds: DeliveryItem[] }) {
  const embeddable = liveFeeds
    .map((feed) => {
      const url = resolveLiveFeedUrl(feed.properties?.liveFeedUrl);
      const built = buildEmbedUrl(url);
      return built ? { feed, embedUrl: built.embedUrl } : null;
    })
    .filter((item): item is { feed: DeliveryItem; embedUrl: string } => item !== null);

  return (
    <div>
      <h2 className={styles.tabHeading}>Media</h2>
      {embeddable.length === 0 ? (
        <p className={styles.empty}>
          No video feeds are currently available for this event.
        </p>
      ) : (
        <div className={styles.mediaList}>
          {embeddable.map(({ feed, embedUrl }) => (
            <div key={feed.id} className={styles.mediaItem}>
              {feed.name && <h4 className={styles.mediaTitle}>{feed.name}</h4>}
              <div className={styles.videoWrap}>
                <iframe
                  src={embedUrl}
                  allowFullScreen
                  allow="autoplay; fullscreen; picture-in-picture"
                  className={styles.videoFrame}
                  title={feed.name}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────────

function DocumentsTab({ documents }: { documents: DeliveryItem[] }) {
  return (
    <div>
      <h2 className={styles.tabHeading}>Documents</h2>
      <ul className={styles.docList}>
        {documents.map((doc) => {
          const fileUrl = proxyMediaUrl(
            doc.properties?.fileDownload ?? doc.properties?.file
          );
          const ext = asString(doc.properties?.extension) ?? "";
          return (
            <li key={doc.id} className={styles.docItem}>
              {ext && (
                <span
                  className={styles.docIcon}
                  data-ext={ext.toLowerCase()}
                >
                  {ext.toUpperCase()}
                </span>
              )}
              {fileUrl ? (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.docLink}
                >
                  {doc.name}
                </a>
              ) : (
                <span>{doc.name}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
