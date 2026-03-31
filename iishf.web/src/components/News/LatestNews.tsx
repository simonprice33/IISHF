// src/components/News/LatestNews.tsx
import Link from "next/link";
import type { NewsListItem } from "../../lib/newsApi";
import styles from "./LatestNews.module.css";
import { buildNewsThumbUrl } from "../../lib/newsShared";

type Props = {
  items: NewsListItem[];
};

export function LatestNews({ items }: Props) {
  if (!items?.length) return null;

  return (
    <section className={styles.homeNewsSection}>
      <h1 className={styles.heading}>
        <span className={styles.orange}>Latest</span> news
      </h1>

      <div className={styles.container}>
        <div className={styles.row}>
          {items.slice(0, 6).map((article) => {
            const thumbUrl = buildNewsThumbUrl(article.articleImage);

            return (
              <div key={article.id} className={styles.col}>
                <Link href={article.url} className={styles.cardLink}>
                  <div className={styles.card}>
                    {thumbUrl ? (
                      <img className={styles.cardImgTop} src={thumbUrl} alt={article.title} loading="lazy" />
                    ) : (
                      <div className={styles.imgFallback} aria-hidden="true" />
                    )}

                    <div className={`${styles.cardBody} ${styles.news}`}>
                      <h5 className={styles.cardTitle}>{article.title}</h5>
                      <p className={styles.cardText}>{article.leadIn ?? ""}</p>
                    </div>

                    <div className={styles.cardOverlay} aria-hidden="true">
                      <i className="fa-regular fa-eye fa-flip-vertical text-white mr-3" />
                      <span className={styles.overlayText}>Read Now</span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
