import Image from "next/image";
import Link from "next/link";
import styles from "./Navbar.module.css";
import type { NavItem } from "./types";

type Props = {
  items: NavItem[];
};

export function Navbar({ items }: Props) {
  return (
    <header className={styles.navbar}>
      <div className={styles.inner}>
        {/* Brand / Logo */}
        <div className={styles.brand}>
          <Link href="/" aria-label="Home">
            <Image
              src="/images/IISHFLogo_text.png"
              alt="IISHF"
              width={260}
              height={60}
              className={styles.logo}
              priority
            />
          </Link>
        </div>

        {/* Nav */}
        <nav aria-label="Primary">
          <ul className={styles.menu}>
            {items.map((item) => {
              const hasChildren = !!item.children?.length;

              return (
                <li key={item.url} className={styles.menuItem}>
                  <Link
                    href={item.url}
                    className={`${styles.link} ${hasChildren ? styles.dropdownToggle : ""}`}
                  >
                    {item.title}
                    {hasChildren && <span className={styles.caret}>▼</span>}
                  </Link>

                  {hasChildren && (
                    <ul className={styles.dropdown}>
                      {item.children!.map((child) => (
                        <li key={child.url} className={styles.dropdownItem}>
                          <Link href={child.url} className={styles.dropdownLink}>
                            {child.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}

            {/* Auth links (you can wire these later) */}
            <li className={styles.menuItem}>
              <div className={styles.authLinks}>
                <Link href="/signup" className={styles.link}>
                  Sign up
                </Link>
                <span className={styles.separator}>|</span>
                <Link href="/signin" className={styles.link}>
                  Sign in
                </Link>
              </div>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
