import { Hero } from "../Hero/Hero";
import { LiveStreamContainer } from "../LiveStream/LiveStreamContainer";
import { LatestNewsContainer } from "../News/LatestNewsContainer";


export function Home() {
  return (
    <main>
      <Hero />
       <LiveStreamContainer  />
       <LatestNewsContainer limit={6} />
      {/* Additional sections will go here */}
    </main>
  );
}