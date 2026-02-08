import { getLatestNews } from "../../lib/newsApi";
import { LatestNews } from "./LatestNews";

type Props = {
  limit?: number;
  parentKey?: string; // default "news"
};

export async function LatestNewsContainer({ limit = 6, parentKey = "news" }: Props) {
  try {
    const items = await getLatestNews(limit, parentKey);
    return <LatestNews items={items} />;
  } catch (e) {
    console.error("LatestNewsContainer failed", e);
    return null;
  }
}
