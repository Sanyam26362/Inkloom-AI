import React from "react";

export function Ticker() {
  const tickerText =
    "TEXT ◆ SOCIAL POSTS ◆ IMAGES ◆ AUDIO ◆ VIDEO REELS ◆ ACCESSIBILITY ◆ LEGAL CLAIMS ◆ BRAND VOICE ◆ ";

  return (
    <section aria-label="Supported Audits" className="w-full bg-[var(--nb-ink)] border-b-4 border-[var(--nb-ink)] overflow-hidden flex items-stretch select-none">
      {/* Left Static Label: Yellow band */}
      <div className="z-10 bg-[var(--nb-yellow)] text-[var(--nb-ink)] px-4 sm:px-6 py-3.5 sm:py-4 border-r-[3px] border-[var(--nb-ink)] shrink-0 flex items-center justify-center font-bold nb-mono text-xs sm:text-sm tracking-wider uppercase">
        ONE AUDIT FOR
      </div>

      {/* Marquee Track: Black band with yellow mono text */}
      <div className="relative flex-1 overflow-hidden py-3 sm:py-3.5 flex items-center">
        <div className="nb-ticker-track flex items-center whitespace-nowrap text-[var(--nb-yellow)] nb-mono text-sm sm:text-base font-bold tracking-widest uppercase">
          <span className="px-4">{tickerText}</span>
          <span className="px-4">{tickerText}</span>
          <span className="px-4">{tickerText}</span>
          <span className="px-4">{tickerText}</span>
        </div>
      </div>
    </section>
  );
}
