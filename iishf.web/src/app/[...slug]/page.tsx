import { notFound } from "next/navigation";
import { getContentByPath, getAllChildren } from "@/lib/umbracoApi";
import { proxyMediaUrl } from "@/lib/umbracoTypes";
import { ContentPageView } from "@/components/ContentPage/ContentPageView";
import { PeoplePage } from "@/components/People/PeoplePage";
import { PresidiumAndOfficersPage } from "@/components/PresidiumAndOfficers/PresidiumAndOfficersPage";
import { NMAPage } from "@/components/NMA/NMAPage";
import { CommitteesPage } from "@/components/Committees/CommitteesPage";
import { TournamentCategoryPage } from "@/components/Tournament/TournamentCategoryPage";
import { EventPage } from "@/components/Tournament/EventPage";
import type { RosterData } from "@/components/Tournament/EventPage";
import type { DeliveryItem } from "@/lib/umbracoTypes";

type Props = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SlugPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const path = "/" + slug.join("/") + "/";

  const page = await getContentByPath(path);
  if (!page) notFound();

  const routeKey = slug.join("/");

  switch (page.contentType) {
    case "officials":
    case "referees": {
      const people = await getAllChildren(routeKey);
      return <PeoplePage page={page} people={people} />;
    }

    case "presidiumAndOfficers": {
      const members = await getAllChildren(routeKey);
      return <PresidiumAndOfficersPage page={page} members={members} />;
    }

    case "nationalMemberAssociations": {
      const associations = await getAllChildren(routeKey);
      return <NMAPage page={page} associations={associations} />;
    }

    case "committees": {
      const committeeNodes = await getAllChildren(routeKey);
      const committees = await Promise.all(
        committeeNodes.map(async (committee) => {
          const committeeKey = (committee.route?.path ?? "")
            .replace(/^\//, "")
            .replace(/\/$/, "");
          const members = committeeKey ? await getAllChildren(committeeKey) : [];
          return { committee, members };
        })
      );
      return <CommitteesPage page={page} committees={committees} />;
    }

    // ── Tournament category pages ─────────────────────────────────────────
    case "europeanCups":
    case "europeanChampionships":
    case "noneTitleEvents": {
      const children = await getAllChildren(routeKey);
      return <TournamentCategoryPage page={page} events={children} />;
    }

    // ── Event series page (e.g. "U13 European Cup") ───────────────────────
    // Children are year nodes ("2026", "2025" …), each of type "event"
    case "events": {
      const sp = await searchParams;
      const yearParam = typeof sp.year === "string" ? sp.year : null;

      // Fetch all year children, sort newest first
      const yearChildren = await getAllChildren(routeKey);
      const sortedYears = [...yearChildren].sort((a, b) =>
        b.name.localeCompare(a.name)
      );

      // Select the requested year, falling back to the most recent
      const selectedEvent: DeliveryItem | null =
        (yearParam
          ? sortedYears.find((c) => c.name === yearParam)
          : undefined) ??
        sortedYears[0] ??
        null;

      const selectedYear = selectedEvent?.name ?? yearParam ?? String(new Date().getFullYear());

      let teams: DeliveryItem[] = [];
      let games: DeliveryItem[] = [];
      let liveFeeds: DeliveryItem[] = [];
      let documents: DeliveryItem[] = [];
      let rosters: RosterData[] = [];

      if (selectedEvent) {
        const eventKey = (selectedEvent.route?.path ?? "")
          .replace(/^\//, "")
          .replace(/\/$/, "");

        if (eventKey) {
          const eventChildren = await getAllChildren(eventKey);
          teams = eventChildren.filter((c) => c.contentType === "team");
          games = eventChildren.filter((c) => c.contentType === "game");
          liveFeeds = eventChildren.filter(
            (c) =>
              c.contentType === "liveFeeds" &&
              c.properties?.showInSite === true
          );
          documents = eventChildren.filter(
            (c) => c.contentType === "document"
          );

          // Fetch each team's roster children (for player stats)
          rosters = await Promise.all(
            teams.map(async (team) => {
              const teamKey = (team.route?.path ?? "")
                .replace(/^\//, "")
                .replace(/\/$/, "");
              const logoUrl = proxyMediaUrl(team.properties?.image);
              if (!teamKey) {
                return {
                  teamId: team.id,
                  teamName: team.name,
                  teamLogoUrl: logoUrl,
                  players: [],
                };
              }
              const teamChildren = await getAllChildren(teamKey);
              return {
                teamId: team.id,
                teamName: team.name,
                teamLogoUrl: logoUrl,
                players: teamChildren.filter(
                  (p) => p.contentType === "roster"
                ),
              };
            })
          );
        }
      }

      return (
        <EventPage
          page={page}
          years={sortedYears}
          selectedYear={selectedYear}
          selectedEvent={selectedEvent}
          teams={teams}
          games={games}
          liveFeeds={liveFeeds}
          documents={documents}
          rosters={rosters}
        />
      );
    }

    // ── Generic hero + rich text fallback ────────────────────────────────
    default:
      return <ContentPageView page={page} />;
  }
}
