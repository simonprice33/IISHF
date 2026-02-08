// src/components/MemberAssociations/MemberAssociationsClient.tsx
"use client";

import Slider from "react-slick";
import styles from "./MemberAssociations.module.css";

type GallerySlide = {
  id: string;
  name: string;
  imageUrl?: string;
  linkUrl?: string;
};

type Props = {
  slides: GallerySlide[];
};

export function MemberAssociationsClient({ slides }: Props) {
  const settings = {
    dots: false,
    arrows: false,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 1800,
    speed: 600,
    slidesToShow: 5,
    slidesToScroll: 1,
    pauseOnHover: true,
    responsive: [
      { breakpoint: 1200, settings: { slidesToShow: 4 } },
      { breakpoint: 992, settings: { slidesToShow: 3 } },
      { breakpoint: 600, settings: { slidesToShow: 2 } },
    ],
  };

  return (
    <section className={styles.section} aria-label="Our Member Federations">
      <h2 className={styles.title}>Our Member Federations</h2>

      <div className={styles.sliderWrap}>
        <Slider {...settings}>
          {slides.map((s) => {
            const img = (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.imageUrl ?? ""}
                alt={s.name}
                className={styles.logo}
                loading="lazy"
              />
            );

            return (
              <div key={s.id} className={styles.slide}>
                {s.linkUrl ? (
                  <a
                    href={s.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.link}
                    aria-label={s.name}
                  >
                    {img}
                  </a>
                ) : (
                  img
                )}
              </div>
            );
          })}
        </Slider>
      </div>
    </section>
  );
}
