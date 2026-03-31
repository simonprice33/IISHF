import { notFound } from "next/navigation";
import { getContentByPath, getAllChildren } from "@/lib/umbracoApi";
import { ContentPageView } from "@/components/ContentPage/ContentPageView";
import { PeoplePage } from "@/components/People/PeoplePage";
import { PresidiumAndOfficersPage } from "@/components/PresidiumAndOfficers/PresidiumAndOfficersPage";
import { NMAPage } from "@/components/NMA/NMAPage";
import { CommitteesPage } from "@/components/Committees/CommitteesPage";

type Props = {
  params: Promise<{ slug: string[] }>;
};

export default async function SlugPage({ params }: Props) {
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

      // Each committee node has its own children (the people)
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

    // contentPage, club, missionValue, and any other content types
    // all fall through to the generic hero + rich text view
    default:
      return <ContentPageView page={page} />;
  }
}
