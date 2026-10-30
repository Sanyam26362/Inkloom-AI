"use client";

import React, { useState, useRef } from "react";

export function Solutions() {
  const [activeTab, setActiveTab] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const solutions = [
    {
      id: "marketing",
      label: "MARKETING",
      pain: "Campaigns stall in review while the launch date doesn't move.",
      does: "Checks every asset the moment it is uploaded and returns specific, rule-cited fixes.",
      outcome: "Fewer review rounds and faster launches.",
    },
    {
      id: "legal",
      label: "LEGAL & COMPLIANCE",
      pain: "Claims slip through, and nobody can show who approved what.",
      does: "Flags unapproved claims, requires written reasons for overrides, and logs every decision.",
      outcome: "A defensible record for every published asset.",
    },
    {
      id: "creative",
      label: "CREATIVE",
      pain: "Feedback arrives late, vague and contradictory.",
      does: "Gives measurable feedback up front: exact colour distance, contrast ratios, rule references.",
      outcome: "Designers fix issues once, before review.",
    },
    {
      id: "agencies",
      label: "AGENCIES",
      pain: "Ten clients, ten rulebooks, one overloaded QA team.",
      does: "Keeps each client's guidelines separate and checks work against the right ruleset.",
      outcome: "Consistent quality across every account.",
    },
  ];

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let newIndex = index;
    if (e.key === "ArrowRight") {
      newIndex = (index + 1) % solutions.length;
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      newIndex = (index - 1 + solutions.length) % solutions.length;
      e.preventDefault();
    } else if (e.key === "Home") {
      newIndex = 0;
      e.preventDefault();
    } else if (e.key === "End") {
      newIndex = solutions.length - 1;
      e.preventDefault();
    }

    if (newIndex !== index) {
      setActiveTab(newIndex);
      tabRefs.current[newIndex]?.focus();
    }
  };

  const handleCtaClick = () => {
    const demoEl = document.getElementById("demo");
    if (demoEl) {
      demoEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const current = solutions[activeTab];

  return (
    <section
      id="solutions"
      aria-labelledby="solutions-heading"
      className="w-full bg-[var(--nb-cream)] nb-section-separator py-16 sm:py-24 px-6 sm:px-10 lg:px-16"
    >
      <div className="max-w-[1280px] mx-auto">
        <span className="nb-eyebrow mb-6">SOLUTIONS</span>
        <h2 id="solutions-heading" className="nb-h2 mb-12 sm:mb-16 text-[var(--nb-ink)]">
          BUILT FOR THE PEOPLE WHO SIGN OFF.
        </h2>

        {/* Accessible Tabs Row */}
        <div
          role="tablist"
          aria-label="Solutions by team role"
          className="flex flex-wrap border-[3px] border-[var(--nb-ink)] bg-white shadow-[6px_6px_0_var(--nb-ink)] divide-y-[3px] sm:divide-y-0 sm:divide-x-[3px] divide-[var(--nb-ink)] mb-8"
        >
          {solutions.map((item, idx) => {
            const isSelected = activeTab === idx;
            return (
              <button
                key={item.id}
                ref={(el) => { tabRefs.current[idx] = el; }}
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={isSelected}
                aria-controls={`panel-${item.id}`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setActiveTab(idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className={`flex-1 min-w-[160px] py-4 px-5 nb-mono text-sm sm:text-base font-bold uppercase tracking-wider transition-colors duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-[var(--nb-ink)] text-[var(--nb-cream)]"
                    : "bg-white text-[var(--nb-ink)] hover:bg-[var(--nb-yellow)]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Tab Panel */}
        <div
          role="tabpanel"
          id={`panel-${current.id}`}
          aria-labelledby={`tab-${current.id}`}
          className="nb-card bg-white p-6 sm:p-10 lg:p-12 shadow-[8px_8px_0_var(--nb-ink)]"
        >
          <div className="flex flex-col gap-8">
            {/* Pain Block */}
            <div className="border-l-[4px] border-[var(--nb-red)] pl-4 sm:pl-6 py-1">
              <span className="nb-chip nb-chip-critical mb-3">
                THE PAIN
              </span>
              <p className="nb-mono text-base sm:text-lg font-bold text-[var(--nb-ink)]">
                {current.pain}
              </p>
            </div>

            {/* What BrandLens Does */}
            <div className="border-l-[4px] border-[var(--nb-ink)] pl-4 sm:pl-6 py-1">
              <span className="nb-mono text-sm sm:text-base font-bold uppercase tracking-widest text-[var(--nb-ink)] block mb-3 opacity-90">
                WHAT BRANDLENS DOES
              </span>
              <p className="nb-mono text-base sm:text-lg text-[var(--nb-ink)] font-medium leading-relaxed">
                {current.does}
              </p>
            </div>

            {/* Outcome Block */}
            <div className="border-l-[4px] border-[var(--nb-green)] pl-4 sm:pl-6 py-1">
              <span className="nb-chip nb-chip-pass mb-3">
                OUTCOME
              </span>
              <p className="nb-mono text-base sm:text-lg font-bold text-[var(--nb-ink)]">
                {current.outcome}
              </p>
            </div>

            {/* CTA Button */}
            <div className="pt-6 border-t-[3px] border-[var(--nb-ink)]">
              <button
                type="button"
                onClick={handleCtaClick}
                className="nb-btn nb-btn-accent"
              >
                SEE IT FOR YOUR TEAM →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
