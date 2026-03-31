// src/components/News/LatestNewsContainer.tsx
import { getLatestNews } from "../../lib/newsApi";
import { LatestNews } from "./LatestNews";

type Props = {
  limit?: number;
};

export async function LatestNewsContainer({ limit = 6 }: Props) {
  try {
    const items = await getLatestNews(limit);
    return <LatestNews items={items} />;
  } catch (e) {
    console.error("LatestNewsContainer failed", e);
    return null;
  }
}
