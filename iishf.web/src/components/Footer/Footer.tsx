import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>© {new Date().getFullYear()} IISHF. All Rights Reserved.</div>
    </footer>
  );
}
