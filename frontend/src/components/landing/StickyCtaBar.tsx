"use client";

import React, { useState, useEffect } from "react";

export function StickyCtaBar() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const heroEl = document.getElementById("hero-heading");
      const demoEl = document.getElementById("demo");

      if (!heroEl) return;

      const heroBottom = heroEl.getBoundingClientRect().bottom;
      const demoTop = demoEl ? demoEl.getBoundingClientRect().top : Infinity;
      const windowHeight = window.innerHeight;

      // Show after scrolling past hero heading (heroBottom < 0)
      // Hide when demo section enters viewport (demoTop <= windowHeight)
      const pastHero = heroBottom < 0;
      const beforeDemo = demoTop > windowHeight * 0.75;

      setIsVisible(pastHero && beforeDemo);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleBookDemo = () => {
    const demoEl = document.getElementById("demo");
    if (demoEl) {
      demoEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Quick Action Demo Bar"
      className="fixed z-40 bottom-0 left-0 right-0 sm:bottom-6 sm:right-6 sm:left-auto p-3 sm:p-0"
    >
      <div className="bg-[var(--nb-yellow)] border-[3px] border-[var(--nb-ink)] shadow-[6px_6px_0_var(--nb-ink)] p-3 sm:py-3.5 sm:px-5 flex items-center justify-between sm:justify-start gap-4">
        <span className="nb-mono text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--nb-ink)]">
          SEE IT ON YOUR CONTENT
        </span>
        <button
          type="button"
          onClick={handleBookDemo}
          className="nb-btn nb-btn-primary nb-btn-sm text-xs font-bold shrink-0"
        >
          BOOK A DEMO →
        </button>
      </div>
    </aside>
  );
}
