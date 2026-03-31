import type { DeliveryItem } from "@/lib/umbracoTypes";
import { asString, proxyMediaUrl } from "@/lib/umbracoTypes";
import { PageHero } from "@/components/PageHero/PageHero";
import { PersonCard } from "@/components/PersonCard/PersonCard";
import styles from "./Committees.module.css";

type CommitteeWithMembers = {
  committee: DeliveryItem;
  members: DeliveryItem[];
};

type Props = {
  page: DeliveryItem;
  committees: CommitteeWithMembers[];
};

export function CommitteesPage({ page, committees }: Props) {
  const p = page.properties ?? {};

  const heroTitle = asString(p.heroTitle) ?? page.name;
  const heroSubtitle = asString(p.heroSubtitle);
  const heroImageUrl = proxyMediaUrl(p.heroImage);

  return (
    <>
      <PageHero title={heroTitle} subtitle={heroSubtitle} imageUrl={heroImageUrl} />

      <div className={styles.body}>
        <div className={styles.inner}>
          {committees.map(({ committee, members }) => {
            const cp = committee.properties ?? {};
            const description = asString(cp.content);

            return (
              <section key={committee.id} className={styles.section}>
                <h2 className={styles.sectionTitle}>{committee.name}</h2>
                {description && <p className={styles.description}>{description}</p>}

                {members.length > 0 && (
                  <div className={styles.grid}>
                    {members.map((m) => (
                      <PersonCard key={m.id} person={m} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
