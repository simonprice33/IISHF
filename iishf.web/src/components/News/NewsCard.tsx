// src/components/News/NewsCard.tsx
import Link from "next/link";
import type { NewsListItem } from "../../lib/newsApi";
import styles from "./LatestNews.module.css";
import { buildNewsThumbUrl } from "../../lib/newsShared";
import { formatDateUKFromUtcIso } from "../../lib/date";

export function NewsCard({ item }: { item: NewsListItem }) {
  const thumbUrl = buildNewsThumbUrl(item.articleImage);

  // Prefer postDate if present, else createDate
  const date = formatDateUKFromUtcIso(item.postDateUtc ?? item.createDateUtc ?? null);

  return (
    <div className={styles.col}>
      <Link href={item.url} className={styles.cardLink}>
        <div className={styles.card}>
          {thumbUrl ? (
            <img className={styles.cardImgTop} src={thumbUrl} alt={item.title} loading="lazy" />
          ) : (
            <div className={styles.imgFallback} aria-hidden="true" />
          )}

          <div className={`${styles.cardBody} ${styles.news}`}>
            {!!date && <div className={styles.cardDate}>{date}</div>}
            <h5 className={styles.cardTitle}>{item.title}</h5>
            <p className={styles.cardText}>{item.leadIn ?? ""}</p>
          </div>

          <div className={styles.cardOverlay} aria-hidden="true">
            <i className="fa-regular fa-eye fa-flip-vertical text-white mr-3" />
            <span className={styles.overlayText}>Read Now</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
