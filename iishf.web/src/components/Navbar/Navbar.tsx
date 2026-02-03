import Image from "next/image";
import Link from "next/link";
import styles from "./Navbar.module.css";
import type { NavItem } from "./types";

type Props = {
  items: NavItem[];
};

export function Navbar({ items }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link className={styles.logoWrap} href="/">
            <Image
              src="/images/IISHFLogo_text.png"
              alt="International Inline Skater Hockey Federation"
              // IMPORTANT: set these to the *actual* pixel size of your source file (or close).
              // If your PNG is 240x160 (recommended for a crisp 80px display), use:
              width={240}
              height={160}
              className={styles.logoImg}
              priority
            />
          </Link>
        </div>

        <nav className={styles.nav}>
          <ul className={styles.navList}>
            {items.map((item) => (
              <li key={item.url} className={styles.navItem}>
                <Link href={item.url} className={styles.navLink}>
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
