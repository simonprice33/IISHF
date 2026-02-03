import Link from "next/link";
import Image from "next/image";
import type { NavItem } from "./types";
import styles from "./Navbar.module.css";

type Props = {
  items: NavItem[];
};

function isTournaments(item: NavItem) {
  return item.title.toLowerCase() === "tournaments";
}

export function NavBar({ items }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link className={styles.logoWrap} href="/">
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

        <nav className={styles.nav}>
          {items.map((item) => {
            const hasChildren = (item.children?.length ?? 0) > 0;

            // Mega dropdown: Tournaments → children are "group columns",
            // and each group has its own children (the actual links).
            if (isTournaments(item) && hasChildren) {
              return (
                <div key={item.url} className={styles.item}>
                  <Link className={styles.link} href={item.url}>
                    {item.title}
                  </Link>

                  <div className={styles.mega}>
                    <div className={styles.megaGrid}>
                      {(item.children ?? []).slice(0, 3).map((col) => (
                        <div key={col.url}>
                          <div className={styles.megaColTitle}>{col.title}</div>
                          {(col.children ?? []).map((child) => (
                            <Link key={child.url} className={styles.megaLink} href={child.url}>
                              {child.title}
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            // Normal dropdown
            if (hasChildren) {
              return (
                <div key={item.url} className={styles.item}>
                  <Link className={styles.link} href={item.url}>
                    {item.title}
                  </Link>

                  <div className={styles.dropdown}>
                    {(item.children ?? []).map((child) => (
                      <Link key={child.url} className={styles.dropdownLink} href={child.url}>
                        {child.title}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }

            // Plain link
            return (
              <div key={item.url} className={styles.item}>
                <Link className={styles.link} href={item.url}>
                  {item.title}
                </Link>
              </div>
            );
          })}

          {/* Optional: keep your auth links on the right until you hook Members properly */}
          <div className={styles.rightLinks}>
            <Link className={styles.link} href="/sign-up">Sign up</Link>
            <span style={{ opacity: 0.5 }}>|</span>
            <Link className={styles.link} href="/sign-in">Sign in</Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
