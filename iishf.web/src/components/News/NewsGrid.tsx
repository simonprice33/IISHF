// src/components/News/NewsGrid.tsx
import type { NewsListItem } from "../../lib/newsApi";
import styles from "./LatestNews.module.css";
import { NewsCard } from "./NewsCard";

type Props = {
  items: NewsListItem[];
};

export function NewsGrid({ items }: Props) {
  if (!items?.length) return null;

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        {items.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
