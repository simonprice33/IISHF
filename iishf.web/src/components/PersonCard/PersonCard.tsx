import type { DeliveryItem } from "@/lib/umbracoTypes";
import { asString, asBool, proxyMediaUrl, extractLink, extractMediaUrl } from "@/lib/umbracoTypes";
import styles from "./PersonCard.module.css";

type Props = {
  person: DeliveryItem;
};

export function PersonCard({ person }: Props) {
  const p = person.properties ?? {};

  const name = asString(p.presidiumMemberName) ?? person.name;
  const role = asString(p.title);
  const email = asString(p.email);
  const telephone = asString(p.telephone);
  const imageUrl = proxyMediaUrl(p.image);

  const web = extractLink(p.web);
  const facebook = extractLink(p.facebook);
  const twitter = extractLink(p.twitter);
  const instagram = extractLink(p.instagram);
  const youtube = extractLink(p.youtube);

  return (
    <div className={styles.card}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={name} className={styles.photo} />
      ) : (
        <div className={styles.photoPlaceholder} aria-hidden="true" />
      )}

      <div className={styles.body}>
        <h5 className={styles.name}>{name}</h5>
        {role && <p className={styles.role}>{role}</p>}

        <div className={styles.links}>
          {email && (
            <a href={`mailto:${email}`} className={styles.iconLink} title="Email">
              <SvgEmail />
            </a>
          )}
          {telephone && (
            <a href={`tel:${telephone}`} className={styles.iconLink} title="Phone">
              <SvgPhone />
            </a>
          )}
          {web && (
            <a href={web.url} target={web.target ?? "_blank"} rel="noopener noreferrer" className={styles.iconLink} title="Website">
              <SvgGlobe />
            </a>
          )}
          {facebook && (
            <a href={facebook.url} target={facebook.target ?? "_blank"} rel="noopener noreferrer" className={styles.iconLink} title="Facebook">
              <SvgFacebook />
            </a>
          )}
          {twitter && (
            <a href={twitter.url} target={twitter.target ?? "_blank"} rel="noopener noreferrer" className={styles.iconLink} title="X / Twitter">
              <SvgX />
            </a>
          )}
          {instagram && (
            <a href={instagram.url} target={instagram.target ?? "_blank"} rel="noopener noreferrer" className={styles.iconLink} title="Instagram">
              <SvgInstagram />
            </a>
          )}
          {youtube && (
            <a href={youtube.url} target={youtube.target ?? "_blank"} rel="noopener noreferrer" className={styles.iconLink} title="YouTube">
              <SvgYoutube />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Inline SVG icons (no external dependency) ── */

function SvgEmail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 7 10-7" />
    </svg>
  );
}

function SvgPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function SvgGlobe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function SvgFacebook() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function SvgX() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function SvgInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function SvgYoutube() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.97C18.88 4 12 4 12 4s-6.88 0-8.59.45A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.97C5.12 20 12 20 12 20s6.88 0 8.59-.45a2.78 2.78 0 0 0 1.95-1.97A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
      <polygon fill="#fff" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
    </svg>
  );
}
