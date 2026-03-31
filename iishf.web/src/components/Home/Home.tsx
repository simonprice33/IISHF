import { Hero } from "../Hero/Hero";
import { LiveStreamContainer } from "../Livestream/LiveStreamContainer";
import { LatestNewsContainer } from "../News/LatestNewsContainer";
import { MissionAndValuesClient } from "../MissionAndValues/MissionAndValuesClient";
import { getMissionItemsFromDelivery } from "@/lib/missionApi";
import { MemberAssociations } from "@/components/MemberAssociations/MemberAssociations";
import { ContactForm } from "@/components/Contact/ContactForm";

export async function Home() {
  const missionItems = await getMissionItemsFromDelivery().catch(() => []);

  return (
    <main>
      <Hero />
      <LiveStreamContainer />
      <LatestNewsContainer limit={6} />
      <MissionAndValuesClient missionItems={missionItems} />
      <MemberAssociations />
      <ContactForm />
    </main>
  );
}