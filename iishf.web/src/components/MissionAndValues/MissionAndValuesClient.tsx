"use client";

import Slider from "react-slick";
import { AnimatedHeadlineClip } from "./AnimatedHeadline";
import styles from "./MissionAndValues.module.css";

type Props = {
  headlineWords?: string[];
  missionItems: string[];
};

export function MissionAndValuesClient({
  headlineWords = ["Values", "Vision", "Mission"],
  missionItems,
}: Props) {
  const sliderSettings = {
    infinite: true,
    arrows: false,
    speed: 1000,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
  };

  // Razor used Skip(1)
  const items = (missionItems ?? []).slice(1);

  return (
    <section className="cd-intro cd-intro-large">
      <div className="clipper-inner">
        <div className="content-on-top">
          <i className={`pe-7s-graph1 ${styles.icon}`} aria-hidden="true" />

          <AnimatedHeadlineClip words={headlineWords} />

          {items.length > 0 && (
            <div className="values">
              <Slider {...sliderSettings}>
                {items.map((child, idx) => {
                  const text = (child ?? "").trim();
                  const isShort = text.length < 50; // matches Razor

                  return (
                    <div key={idx} className={styles.slide}>
                      {isShort ? (
                        <h1 className={styles.missionH1}>{text}</h1>
                      ) : (
                        <h4 className={styles.missionH4}>{text}</h4>
                      )}
                    </div>
                  );
                })}
              </Slider>
            </div>
          )}
        </div>

        <div className="overlay" />
      </div>
    </section>
  );
}
