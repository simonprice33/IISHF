import type { DeliveryItem } from "@/lib/umbracoTypes";
import { asString, proxyMediaUrl } from "@/lib/umbracoTypes";
import { PageHero } from "@/components/PageHero/PageHero";
import styles from "./ContentPage.module.css";

type Props = {
  page: DeliveryItem;
};

export function ContentPageView({ page }: Props) {
  const p = page.properties ?? {};

  const heroTitle = asString(p.heroTitle) ?? page.name;
  const heroSubtitle = asString(p.heroSubtitle);
  const heroImageUrl = proxyMediaUrl(p.heroImage);
  const pageContent = asString(p.pageContent);

  return (
    <>
      <PageHero title={heroTitle} subtitle={heroSubtitle} imageUrl={heroImageUrl} />
      {pageContent && (
        <div className={styles.body}>
          <div className={styles.inner}>
            <div
              className={styles.richText}
              dangerouslySetInnerHTML={{ __html: pageContent }}
            />
          </div>
        </div>
      )}
    </>
  );
}
