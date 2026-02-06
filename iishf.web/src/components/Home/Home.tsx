import { Hero } from "../Hero/Hero";
import { LiveStreamContainer } from "../LiveStream/LiveStreamContainer";


export function Home() {
  return (
    <main>
      <Hero />
       <LiveStreamContainer  />
      {/* Additional sections will go here */}
    </main>
  );
}