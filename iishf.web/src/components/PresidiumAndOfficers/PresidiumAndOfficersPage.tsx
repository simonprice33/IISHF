import type { DeliveryItem } from "@/lib/umbracoTypes";
import { asString, asBool, proxyMediaUrl } from "@/lib/umbracoTypes";
import { PageHero } from "@/components/PageHero/PageHero";
import { PersonCard } from "@/components/PersonCard/PersonCard";
import styles from "./PresidiumAndOfficers.module.css";

type Props = {
  page: DeliveryItem;
  members: DeliveryItem[];
};

export function PresidiumAndOfficersPage({ page, members }: Props) {
  const p = page.properties ?? {};

  const heroTitle = asString(p.heroTitle) ?? page.name;
  const heroSubtitle = asString(p.heroSubtitle);
  const heroImageUrl = proxyMediaUrl(p.heroImage);
  const presidiumContent = asString(p.presidiumContent);
  const orgStructureUrl = proxyMediaUrl(p.orgStructure ?? p.OrgStructure);

  const presidium = members.filter((m) => asBool(m.properties?.isPresidium) === true);
  const officers = members.filter((m) => !asBool(m.properties?.isPresidium));

  return (
    <>
      <PageHero title={heroTitle} subtitle={heroSubtitle} imageUrl={heroImageUrl} />

      <div className={styles.body}>
        <div className={styles.inner}>

          {presidium.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Presidium</h2>
              <div className={styles.grid}>
                {presidium.map((m) => (
                  <PersonCard key={m.id} person={m} />
                ))}
              </div>
            </section>
          )}

          {(presidiumContent || orgStructureUrl) && (
            <section className={styles.section}>
              {presidiumContent && (
                <div
                  className={styles.richText}
                  dangerouslySetInnerHTML={{ __html: presidiumContent }}
                />
              )}
              {orgStructureUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={orgStructureUrl}
                  alt="Organisational structure"
                  className={styles.orgChart}
                />
              )}
            </section>
          )}

          {officers.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Officers</h2>
              <div className={styles.grid}>
                {officers.map((m) => (
                  <PersonCard key={m.id} person={m} />
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </>
  );
}
