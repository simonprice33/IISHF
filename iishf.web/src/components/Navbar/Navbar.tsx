import Link from "next/link";
import Image from "next/image";
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
            {/* Use intrinsic size, then CSS controls final rendered height */}
            <Image
              src="/images/IISHFLogo_text.png"
              alt="IISHF logo"
              width={770}
              height={212}
              className={styles.logoImg}
              priority
            />
          </Link>
        </div>

        <nav className={styles.nav} aria-label="Primary">
          <ul className={styles.navRoot}>
            {items.map((item) => (
              <li className={styles.navItem} key={item.url}>
                <Link href={item.url}>{item.title}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
