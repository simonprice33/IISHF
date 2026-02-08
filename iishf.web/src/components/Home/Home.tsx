import { Hero } from "../Hero/Hero";
import { LiveStreamContainer } from "../LiveStream/LiveStreamContainer";
import { LatestNewsContainer } from "../News/LatestNewsContainer";
import { MissionAndValuesClient } from "../MissionAndValues/MissionAndValuesClient";
import { getMissionItemsFromDelivery } from "@/lib/missionApi";

export async function Home() {
  const missionItems = await getMissionItemsFromDelivery();

  return (
    <main>
      <Hero />
       <LiveStreamContainer  />
       <LatestNewsContainer limit={6} />
       <MissionAndValuesClient missionItems={missionItems} />
      {/* Additional sections will go here */}
    </main>
  );

}