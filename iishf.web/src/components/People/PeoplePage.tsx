import type { DeliveryItem } from "@/lib/umbracoTypes";
import { asString, proxyMediaUrl } from "@/lib/umbracoTypes";
import { PageHero } from "@/components/PageHero/PageHero";
import { PersonCard } from "@/components/PersonCard/PersonCard";
import styles from "./People.module.css";

type Props = {
  page: DeliveryItem;
  people: DeliveryItem[];
};

export function PeoplePage({ page, people }: Props) {
  const p = page.properties ?? {};

  const heroTitle = asString(p.heroTitle) ?? page.name;
  const heroSubtitle = asString(p.heroSubtitle);
  const heroImageUrl = proxyMediaUrl(p.heroImage);
  const intro = asString(p.content);

  return (
    <>
      <PageHero title={heroTitle} subtitle={heroSubtitle} imageUrl={heroImageUrl} />

      <div className={styles.body}>
        <div className={styles.inner}>
          {intro && <p className={styles.intro}>{intro}</p>}

          {people.length > 0 ? (
            <div className={styles.grid}>
              {people.map((person) => (
                <PersonCard key={person.id} person={person} />
              ))}
            </div>
          ) : (
            <p className={styles.empty}>No entries found.</p>
          )}
        </div>
      </div>
    </>
  );
}
