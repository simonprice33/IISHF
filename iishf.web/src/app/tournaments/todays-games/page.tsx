import type { Metadata } from "next";
import { TodaysGamesContainer } from "@/components/TodaysGames/TodaysGamesContainer";

export const metadata: Metadata = {
  title: "Today's Games | IISHF",
  description: "Live scores and today's game schedule for all IISHF events.",
};

export default function TodaysGamesPage() {
  return <TodaysGamesContainer />;
}
