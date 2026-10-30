"use client";

import React from "react";
import { useApp } from "@/context/AppContext";

export function Hero() {
  const { openAuthModal } = useApp();

  const handleBookDemo = () => {
    const demoEl = document.getElementById("demo");
    if (demoEl) {
      demoEl.scrollIntoView({ behavior: "smooth" });
    } else {
      openAuthModal();
    }
  };

  return (
    <section aria-labelledby="hero-heading" className="w-full border-b-4 border-[var(--nb-ink)]">
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 items-stretch">
        {/* Left Column: Cream with Grid Backdrop */}
        <div className="lg:col-span-7 bg-[var(--nb-cream)] nb-grid-backdrop p-6 sm:p-10 lg:p-16 flex flex-col justify-center">
          <div>
            <span className="nb-eyebrow mb-6">
              ENTERPRISE BRAND INTELLIGENCE / 2026
            </span>

            <h1 id="hero-heading" className="nb-h1 mb-6 text-[var(--nb-ink)]">
              YOUR<br />
              BRAND<br />
              {/* <span style={{ wordSpacing: "-0.4em" }}>ON THE</span><br /> */}
              ALWAYS  <br />
              ALIGNED.
            </h1>

            <p className="nb-mono text-base sm:text-lg leading-relaxed text-[var(--nb-ink)] mb-8 max-w-xl font-medium">
              Inkloom AI checks every post, image, voiceover and video against your brand rules before it goes live, and keeps a signed record of every decision.
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-8">
              <button
                type="button"
                onClick={handleBookDemo}
                className="nb-btn nb-btn-primary"
              >
                BOOK A DEMO →
              </button>
              <button
                type="button"
                onClick={() => openAuthModal()}
                className="nb-btn nb-btn-secondary"
              >
                START FREE TRIAL
              </button>
            </div>

            <p className="nb-mono text-sm sm:text-base tracking-wide text-[var(--nb-ink)] font-bold">
              Multi-modal · Human-approved · Fully audit-logged
            </p>
          </div>
        </div>

        {/* Right Column: Solid Yellow with 4px Rule Divider */}
        <div className="lg:col-span-5 bg-[var(--nb-yellow)] border-t-4 lg:border-t-0 lg:border-l-4 border-[var(--nb-ink)] p-6 sm:p-10 lg:p-12 flex items-center justify-center overflow-hidden">
          {/* Stacked Window Container */}
          <div className="relative w-full max-w-[460px] py-4">
            {/* Back Window (Stacked behind for depth) */}
            <div
              aria-hidden="true"
              className="absolute inset-0 translate-x-3 translate-y-3 bg-white border-[3px] border-[var(--nb-ink)] shadow-[6px_6px_0_var(--nb-ink)]"
            >
              <div className="h-8 bg-[var(--nb-ink)] border-b-[3px] border-[var(--nb-ink)] flex items-center px-3">
                <span className="w-2.5 h-2.5 bg-white opacity-40"></span>
              </div>
            </div>

            {/* Front Window (Tilted 1.5deg) */}
            <div className="relative nb-hero-window-front bg-[var(--nb-blue)] border-[3px] border-[var(--nb-ink)] shadow-[8px_8px_0_var(--nb-ink)]">
              {/* Title Bar */}
              <div className="bg-[var(--nb-ink)] text-white px-3 py-2 flex items-center justify-between border-b-[3px] border-[var(--nb-ink)] select-none">
                <div className="flex items-center gap-2">
                  {/* Small Grid Icon (pure SVG) */}
                  <svg className="w-3.5 h-3.5 text-white fill-current" viewBox="0 0 16 16">
                    <rect x="1" y="1" width="6" height="6" />
                    <rect x="9" y="1" width="6" height="6" />
                    <rect x="1" y="9" width="6" height="6" />
                    <rect x="9" y="9" width="6" height="6" />
                  </svg>
                  <span className="nb-mono text-xs font-bold tracking-wider">
                    MULTI-MODAL_QA.EXE
                  </span>
                </div>

                {/* 3 Window Buttons: minimise, maximise, close */}
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 bg-white text-[var(--nb-ink)] flex items-center justify-center font-bold text-[10px] border border-[var(--nb-ink)] leading-none">
                    _
                  </div>
                  <div className="w-4 h-4 bg-white text-[var(--nb-ink)] flex items-center justify-center font-bold text-[10px] border border-[var(--nb-ink)] leading-none">
                    □
                  </div>
                  <div className="w-4 h-4 bg-[var(--nb-red)] text-white flex items-center justify-center font-bold text-[10px] border border-[var(--nb-ink)] leading-none">
                    ✕
                  </div>
                </div>
              </div>

              {/* Window Body (Blue #A5D8FF) */}
              <div className="p-4 sm:p-5 flex flex-col gap-4">
                {/* Video Frame Panel (Pink #FF74B1) */}
                <div className="relative bg-[var(--nb-pink)] border-[3px] border-[var(--nb-ink)] p-4 h-44 sm:h-48 flex flex-col justify-between shadow-[3px_3px_0_var(--nb-ink)]">
                  {/* Frame Label */}
                  <div className="flex items-center justify-between">
                    <span className="nb-mono text-xs font-bold text-[var(--nb-ink)] bg-white px-2 py-0.5 border border-[var(--nb-ink)]">
                      BRAND FILM / FRAME 0842
                    </span>
                    <span className="w-2.5 h-2.5 bg-[var(--nb-red)] border border-[var(--nb-ink)] animate-pulse"></span>
                  </div>

                  {/* Play Button in the middle */}
                  <div className="self-center">
                    <div className="w-12 h-12 bg-[var(--nb-yellow)] border-[3px] border-[var(--nb-ink)] shadow-[3px_3px_0_var(--nb-ink)] flex items-center justify-center">
                      <div className="w-0 h-0 border-y-[7px] border-y-transparent border-l-[12px] border-l-[var(--nb-ink)] ml-1"></div>
                    </div>
                  </div>

                  {/* Timecode Chip */}
                  <div className="self-start">
                    <span className="nb-mono text-xs sm:text-[13px] font-bold bg-[var(--nb-ink)] text-white px-2.5 py-1 border border-[var(--nb-ink)]">
                      00:14:08 / 01:02:11
                    </span>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="nb-mono text-xs sm:text-sm font-bold text-[var(--nb-ink)] tracking-wider">
                  ANALYZING FRAME 0842...
                </div>

                {/* Finding Rows */}
                <div className="flex flex-col gap-2.5">
                  {/* Red Row: Unapproved Claim */}
                  <div className="bg-white border-[3px] border-[var(--nb-ink)] p-3 shadow-[3px_3px_0_var(--nb-ink)]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="nb-chip nb-chip-critical text-xs py-0.5 px-2">
                        ! UNAPPROVED CLAIM
                      </span>
                    </div>
                    <p className="nb-mono text-xs sm:text-sm text-[var(--nb-ink)] font-medium">
                      &quot;#1 in the category&quot; has no approved source
                    </p>
                  </div>

                  {/* Green Row: Logo Clear Space */}
                  <div className="bg-white border-[3px] border-[var(--nb-ink)] p-3 shadow-[3px_3px_0_var(--nb-ink)]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="nb-chip nb-chip-pass text-xs py-0.5 px-2">
                        ✓ LOGO CLEAR SPACE
                      </span>
                    </div>
                    <p className="nb-mono text-xs sm:text-sm text-[var(--nb-ink)] font-medium">
                      Meets minimum clearance
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
