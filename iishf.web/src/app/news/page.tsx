// src/app/news/page.tsx
import { getLatestNews } from "@/lib/newsApi";
import { NewsGrid } from "@/components/News/NewsGrid";
import styles from "@/components/News/news.module.css";

export default async function NewsPage() {
  const items = await getLatestNews(100);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>News</h1>
      </div>

      <div className={styles.layout}>
        <div className={styles.main}>
          <NewsGrid items={items} />
        </div>

        <aside className={styles.sidebar}>
          {/* keep your existing filter UI here if you already have it */}
        </aside>
      </div>
    </div>
  );
}
