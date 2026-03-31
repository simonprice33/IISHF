import styles from "./PageHero.module.css";

type Props = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
};

export function PageHero({ title, subtitle, imageUrl }: Props) {
  return (
    <div
      className={styles.hero}
      style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
    >
      <div className={styles.overlay} />
      <div className={styles.inner}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
    </div>
  );
}
