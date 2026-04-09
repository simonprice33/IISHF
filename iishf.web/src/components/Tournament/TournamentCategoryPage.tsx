import Link from "next/link";
import { PageHero } from "@/components/PageHero/PageHero";
import type { DeliveryItem } from "@/lib/umbracoTypes";
import { proxyMediaUrl } from "@/lib/umbracoTypes";
import styles from "./TournamentCategoryPage.module.css";

type Props = {
  page: DeliveryItem;
  events: DeliveryItem[];
};

export function TournamentCategoryPage({ page, events }: Props) {
  const heroImage = proxyMediaUrl(page.properties?.heroImage);
  const heroTitle =
    (page.properties?.heroTitle as string) || page.name;

  return (
    <>
      <PageHero title={heroTitle} imageUrl={heroImage} />

      <div className={styles.container}>
        {events.length === 0 ? (
          <p className={styles.empty}>No events found.</p>
        ) : (
          <div className={styles.grid}>
            {events.map((ev) => {
              const href = ev.route?.path ?? "#";
              const logoUrl = proxyMediaUrl(ev.properties?.image);

              return (
                <Link key={ev.id} href={href} className={styles.card}>
                  <div className={styles.cardInner}>
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoUrl}
                        alt={ev.name}
                        className={styles.cardImg}
                      />
                    ) : (
                      <div className={styles.cardImgPlaceholder} />
                    )}
                    <h3 className={styles.cardTitle}>{ev.name}</h3>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
