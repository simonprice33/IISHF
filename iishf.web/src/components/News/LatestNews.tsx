import Link from "next/link";
import type { NewsListItem } from "../../lib/newsApi";
import styles from "./LatestNews.module.css";

type Props = {
  items: NewsListItem[];
};

type CropperJson = {
  url?: string; // <-- Umbraco uses url
  src?: string; // (some older shapes use src)
  crops?: Array<{
    alias?: string;
    width?: number;
    height?: number;
    coordinates?: { x1?: number; y1?: number; x2?: number; y2?: number };
  }>;
};

function parseCropper(value: unknown): CropperJson | null {
  if (!value) return null;
  if (typeof value === "object") return value as CropperJson;

  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;

    // plain URL string
    if (!s.startsWith("{")) return { url: s };

    try {
      return JSON.parse(s) as CropperJson;
    } catch {
      return null;
    }
  }

  return null;
}

function proxyIfMedia(url: string): string {
  // If Umbraco returns /media/..., serve via our proxy so it resolves on localhost:3000
  if (url.startsWith("/media/")) return `/api/umbraco${url}`;
  return url;
}

function buildThumbUrl(articleImage: unknown): string | null {
  const cropper = parseCropper(articleImage);

  // Umbraco Delivery API: properties.articleImage.url
  const raw = (cropper?.url ?? cropper?.src ?? "").toString().trim();
  if (!raw) return null;

  const base = proxyIfMedia(raw);

  const crops = Array.isArray(cropper?.crops) ? cropper!.crops! : [];
  const main = crops.find((c) => (c?.alias || "").toString() === "Main");

  if (!main) return base;

  const width = Number(main.width);
  const height = Number(main.height);

  const coords = main.coordinates;
  if (
    coords &&
    typeof coords.x1 === "number" &&
    typeof coords.y1 === "number" &&
    typeof coords.x2 === "number" &&
    typeof coords.y2 === "number" &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0
  ) {
    // fraction -> pixel crop (same approach as Razor-style crop)
    const cropX = Math.floor(coords.x1 * width);
    const cropY = Math.floor(coords.y1 * height);
    const cropW = Math.floor((coords.x2 - coords.x1) * width);
    const cropH = Math.floor((coords.y2 - coords.y1) * height);

    if (cropW > 0 && cropH > 0) {
      return `${base}?mode=crop&x=${cropX}&y=${cropY}&width=${cropW}&height=${cropH}`;
    }

    return base;
  }

  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return `${base}?mode=crop&width=${width}&height=${height}`;
  }

  return base;
}

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
            const thumbUrl = buildThumbUrl(article.articleImage);

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
