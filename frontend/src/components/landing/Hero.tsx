"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { HeroComputerIllustration } from "@/components/landing/HeroComputerIllustration";

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
              BrandLens checks every post, image, voiceover and video against your brand rules before it goes live, and keeps a signed record of every decision.
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
          <HeroComputerIllustration />
        </div>
      </div>
    </section>
  );
}
