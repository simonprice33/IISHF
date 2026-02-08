"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type Props = {
  words: string[];
  initialIndex?: number;

  // CodyHouse-style timings (ms)
  revealDurationMs?: number;        // jQuery animate({width:2px}) + animate({width:word+10})
  revealAnimationDelayMs?: number;  // time word stays fully visible before collapsing again
};

export function AnimatedHeadlineClip({
  words,
  initialIndex = 0,
  revealDurationMs = 600,
  revealAnimationDelayMs = 1500,
}: Props) {
  const safeWords = useMemo(() => (words ?? []).map((w) => w?.trim()).filter(Boolean) as string[], [words]);

  const [index, setIndex] = useState(() => {
    if (safeWords.length === 0) return 0;
    return Math.min(Math.max(initialIndex, 0), safeWords.length - 1);
  });

  // Controls the “typing” illusion
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const timeouts = useRef<number[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const clearTimers = () => {
    timeouts.current.forEach((t) => window.clearTimeout(t));
    timeouts.current = [];
  };

  const setWrapperWidthPx = (px: number) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    wrapper.style.width = `${Math.max(2, Math.ceil(px))}px`;
  };

  const measureWordWidth = (i: number) => {
    const el = wordRefs.current[i];
    if (!el) return 0;
    // measure the <b> text width
    return el.getBoundingClientRect().width;
  };

  // Ensure wrapper has the correct width on first paint (prevents “jump”)
  useLayoutEffect(() => {
    if (safeWords.length === 0) return;
    const w = measureWordWidth(index);
    setWrapperWidthPx(w + 10);
  }, [safeWords.length, index]);

  useEffect(() => {
    if (safeWords.length <= 1) return;

    clearTimers();
    setIsAnimating(true);

    const runCycle = (currentIndex: number) => {
      const nextIndex = (currentIndex + 1) % safeWords.length;

      // 1) HOLD: keep current word visible for revealAnimationDelayMs
      timeouts.current.push(
        window.setTimeout(() => {
          const wrapper = wrapperRef.current;
          if (!wrapper) return;

          // 2) COLLAPSE to show only cursor (like jQuery animate width: '2px')
          wrapper.style.transition = `width ${revealDurationMs}ms ease`;
          setWrapperWidthPx(2);

          // 3) After collapse completes, switch word and EXPAND to its width
          timeouts.current.push(
            window.setTimeout(() => {
              setIndex(nextIndex);

              // wait a tick so the new word is rendered before measuring
              requestAnimationFrame(() => {
                const nextW = measureWordWidth(nextIndex);
                const wrapper2 = wrapperRef.current;
                if (!wrapper2) return;

                wrapper2.style.transition = `width ${revealDurationMs}ms ease`;
                setWrapperWidthPx(nextW + 10);

                // 4) After expand completes, start next cycle
                timeouts.current.push(
                  window.setTimeout(() => runCycle(nextIndex), revealDurationMs)
                );
              });
            }, revealDurationMs)
          );
        }, revealAnimationDelayMs)
      );
    };

    runCycle(index);

    return () => {
      clearTimers();
      setIsAnimating(false);
    };
    // we intentionally do NOT depend on index here, because we manage the cycle ourselves
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeWords.length, revealDurationMs, revealAnimationDelayMs]);

  if (safeWords.length === 0) return null;

  return (
    <h1 className="cd-headline clip is-full-width">
      <span
        ref={wrapperRef}
        className="cd-words-wrapper"
        style={{
          // keep overflow hidden, cursor handled by CSS ::after
          overflow: "hidden",
          display: "inline-block",
          verticalAlign: "top",
          // ensure transition exists even before JS sets it
          transition: `width ${revealDurationMs}ms ease`,
          willChange: isAnimating ? "width" : undefined,
        }}
      >
        {safeWords.map((w, i) => {
          const isVisible = i === index;
          return (
            <b
              key={`${w}-${i}`}
              className={isVisible ? "is-visible" : "is-hidden"}
              // we need an element to measure width reliably
              ref={(el) => {
                // Wrap the b’s contents in a span so width measurement stays consistent
                // (some browsers measure <b> widths oddly when absolutely positioned)
                wordRefs.current[i] = el ? (el.querySelector("span") as HTMLSpanElement) : null;
              }}
            >
              <span style={{ display: "inline-block" }}>{w}</span>
            </b>
          );
        })}
      </span>
    </h1>
  );
}
