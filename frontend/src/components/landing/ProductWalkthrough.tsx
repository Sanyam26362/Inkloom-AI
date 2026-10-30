import React from "react";

export function ProductWalkthrough() {
  return (
    <section
      aria-labelledby="product-heading"
      className="w-full bg-[var(--nb-cream)] nb-section-separator py-16 sm:py-24 px-6 sm:px-10 lg:px-16"
    >
      <div className="max-w-[1280px] mx-auto">
        <span className="nb-eyebrow mb-6">THE PRODUCT</span>
        <h2 id="product-heading" className="nb-h2 mb-12 sm:mb-16 text-[var(--nb-ink)]">
          EVERY FINDING COMES WITH ITS RECEIPT.
        </h2>

        {/* Large Bordered Audit Screen Mockup */}
        <div className="nb-card bg-white overflow-hidden mb-8">
          {/* Mock Window Top Bar */}
          <div className="bg-[var(--nb-ink)] text-white px-4 py-3 flex items-center justify-between border-b-[3px] border-[var(--nb-ink)]">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-[var(--nb-yellow)] border border-[var(--nb-ink)]"></span>
              <span className="nb-mono text-xs sm:text-sm font-bold tracking-wider">
                BRANDLENS AUDIT / BRAND: NORTHWIND FOODS
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="nb-mono text-[11px] font-bold bg-[var(--nb-green)] text-[var(--nb-ink)] px-2 py-0.5 border border-white">
                AUDIT COMPLETED
              </span>
            </div>
          </div>

          {/* Audit Window Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y-[3px] lg:divide-y-0 lg:divide-x-[3px] divide-[var(--nb-ink)]">
            {/* Left Pane: Social Post Preview */}
            <div className="lg:col-span-5 p-6 sm:p-8 bg-[#faf7f2] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-[var(--nb-ink)] border-dashed">
                  <span className="nb-mono text-xs sm:text-sm font-bold text-[var(--nb-ink)] uppercase">
                    ASSET: INSTAGRAM_REEL_CAPTION.TXT
                  </span>
                  <span className="nb-mono text-xs sm:text-sm font-bold text-[var(--nb-ink)] opacity-90">
                    RATIO 4:5
                  </span>
                </div>

                {/* Post Preview Card */}
                <div className="border-[3px] border-[var(--nb-ink)] bg-white p-5 shadow-[4px_4px_0_var(--nb-ink)]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 bg-[var(--nb-yellow)] border-2 border-[var(--nb-ink)] flex items-center justify-center font-bold text-xs">
                      NF
                    </div>
                    <div>
                      <p className="nb-mono text-xs sm:text-sm font-bold text-[var(--nb-ink)] leading-none">
                        northwind_foods
                      </p>
                      <p className="nb-mono text-xs text-[var(--nb-ink)] opacity-85 mt-1 font-medium">
                        Sponsored · Fictional Brand
                      </p>
                    </div>
                  </div>

                  {/* Mock Post Graphic Box */}
                  <div className="w-full aspect-[4/3] bg-[var(--nb-blue)] border-2 border-[var(--nb-ink)] mb-4 flex flex-col items-center justify-center p-4 text-center">
                    <span className="nb-mono text-xs sm:text-sm font-bold bg-white px-2 py-1 border border-[var(--nb-ink)] mb-2 shadow-[2px_2px_0_var(--nb-ink)]">
                      NEW OAT CRUNCH
                    </span>
                    <p className="nb-mono text-xs sm:text-sm font-medium text-[var(--nb-ink)]">
                      [Product imagery banner]
                    </p>
                  </div>

                  {/* Caption with Highlighted Errors */}
                  <p className="nb-mono text-xs sm:text-sm leading-relaxed text-[var(--nb-ink)] mb-2">
                    Start your morning right. Our organic crunch is{" "}
                    <span className="bg-[var(--nb-red)]/30 border-b-2 border-[var(--nb-red)] px-0.5 font-bold">
                      &quot;Clinically proven&quot;
                    </span>{" "}
                    to energize your routine at a super{" "}
                    <span className="bg-[var(--nb-orange)]/30 border-b-2 border-[var(--nb-orange)] px-0.5 font-bold">
                      &quot;cheap&quot;
                    </span>{" "}
                    price. Grab yours today! #Northwind #Breakfast
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t-2 border-[var(--nb-ink)] border-dashed">
                <span className="nb-mono text-xs sm:text-sm font-bold text-[var(--nb-ink)] uppercase">
                  3 FINDINGS DETECTED · 1 CRITICAL BLOCKER
                </span>
              </div>
            </div>

            {/* Right Pane: Findings List */}
            <div className="lg:col-span-7 p-6 sm:p-8 bg-white flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b-2 border-[var(--nb-ink)]">
                <span className="nb-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--nb-ink)]">
                  FINDINGS & RECEIPT CITATIONS
                </span>
                <span className="nb-mono text-xs sm:text-sm font-bold text-[var(--nb-ink)] opacity-90">
                  PAGE 1 OF 1
                </span>
              </div>

              {/* Row 1: Critical */}
              <div className="border-[3px] border-[var(--nb-ink)] p-4 sm:p-5 shadow-[4px_4px_0_var(--nb-ink)] bg-[#fff9f9]">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-none bg-[var(--nb-yellow)] border-2 border-[var(--nb-ink)] flex items-center justify-center nb-mono font-black text-xs text-[var(--nb-ink)]">
                      1
                    </span>
                    <span className="nb-chip nb-chip-critical text-[11px]">
                      CRITICAL
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-none bg-[var(--nb-yellow)] border-2 border-[var(--nb-ink)] flex items-center justify-center nb-mono font-black text-xs text-[var(--nb-ink)]">
                      2
                    </span>
                    <span className="nb-mono text-xs font-bold bg-[var(--nb-cream)] border-2 border-[var(--nb-ink)] px-2 py-0.5">
                      FACTUAL_CLAIM
                    </span>
                  </div>
                </div>

                <p className="nb-mono text-sm font-bold text-[var(--nb-ink)] mb-2">
                  &quot;Clinically proven&quot; has no approved source.
                </p>

                <div className="flex items-center gap-1.5 mb-4">
                  <span className="w-5 h-5 rounded-none bg-[var(--nb-yellow)] border-2 border-[var(--nb-ink)] flex items-center justify-center nb-mono font-black text-xs text-[var(--nb-ink)]">
                    3
                  </span>
                  <p className="nb-mono text-xs text-[var(--nb-ink)] font-medium underline">
                    Guideline §4.2 Claims substantiation
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t-2 border-[var(--nb-ink)] border-dashed">
                  <span className="w-5 h-5 rounded-none bg-[var(--nb-yellow)] border-2 border-[var(--nb-ink)] flex items-center justify-center nb-mono font-black text-xs text-[var(--nb-ink)]">
                    4
                  </span>
                  <button
                    type="button"
                    className="nb-btn nb-btn-sm nb-btn-accent text-[11px]"
                  >
                    ACCEPT FIX
                  </button>
                  <button
                    type="button"
                    className="nb-btn nb-btn-sm nb-btn-secondary text-[11px]"
                  >
                    OVERRIDE
                  </button>
                </div>
              </div>

              {/* Row 2: Warning */}
              <div className="border-[3px] border-[var(--nb-ink)] p-4 sm:p-5 shadow-[4px_4px_0_var(--nb-ink)] bg-[#fffdf9]">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="nb-chip nb-chip-warning text-[11px]">
                    WARNING
                  </span>
                  <span className="nb-mono text-xs font-bold bg-[var(--nb-cream)] border-2 border-[var(--nb-ink)] px-2 py-0.5">
                    TERMINOLOGY
                  </span>
                </div>
                <p className="nb-mono text-sm font-bold text-[var(--nb-ink)] mb-2">
                  &quot;Cheap&quot; is on the banned-terms list. Suggested: &quot;Affordable&quot;.
                </p>
                <p className="nb-mono text-xs text-[var(--nb-ink)] font-medium underline mb-3">
                  §2.1 Preferred vocabulary
                </p>
                <div className="flex items-center gap-3 pt-3 border-t-2 border-[var(--nb-ink)] border-dashed">
                  <button
                    type="button"
                    className="nb-btn nb-btn-sm nb-btn-accent text-[11px]"
                  >
                    ACCEPT FIX
                  </button>
                  <button
                    type="button"
                    className="nb-btn nb-btn-sm nb-btn-secondary text-[11px]"
                  >
                    OVERRIDE
                  </button>
                </div>
              </div>

              {/* Row 3: Suggestion */}
              <div className="border-[3px] border-[var(--nb-ink)] p-4 sm:p-5 shadow-[4px_4px_0_var(--nb-ink)] bg-[#f9fcff]">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="nb-chip nb-chip-suggestion text-[11px]">
                    SUGGESTION
                  </span>
                  <span className="nb-mono text-xs font-bold bg-[var(--nb-cream)] border-2 border-[var(--nb-ink)] px-2 py-0.5">
                    ACCESSIBILITY
                  </span>
                </div>
                <p className="nb-mono text-sm font-bold text-[var(--nb-ink)] mb-2">
                  Add alt-text to the product image.
                </p>
                <p className="nb-mono text-xs text-[var(--nb-ink)] font-medium underline mb-3">
                  §6.3 Accessibility
                </p>
                <div className="flex items-center gap-3 pt-3 border-t-2 border-[var(--nb-ink)] border-dashed">
                  <button
                    type="button"
                    className="nb-btn nb-btn-sm nb-btn-accent text-[11px]"
                  >
                    ACCEPT FIX
                  </button>
                  <button
                    type="button"
                    className="nb-btn nb-btn-sm nb-btn-secondary text-[11px]"
                  >
                    OVERRIDE
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend for Callouts */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-[3px] border-[var(--nb-ink)] bg-white shadow-[4px_4px_0_var(--nb-ink)] mb-4">
          <div className="flex flex-wrap items-center gap-6">
            <span className="nb-mono text-xs font-black uppercase text-[var(--nb-ink)]">
              LEGEND:
            </span>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-[var(--nb-yellow)] border-2 border-[var(--nb-ink)] flex items-center justify-center nb-mono font-black text-xs text-[var(--nb-ink)]">
                1
              </span>
              <span className="nb-mono text-xs font-bold uppercase text-[var(--nb-ink)]">
                Severity
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-[var(--nb-yellow)] border-2 border-[var(--nb-ink)] flex items-center justify-center nb-mono font-black text-xs text-[var(--nb-ink)]">
                2
              </span>
              <span className="nb-mono text-xs font-bold uppercase text-[var(--nb-ink)]">
                Category
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-[var(--nb-yellow)] border-2 border-[var(--nb-ink)] flex items-center justify-center nb-mono font-black text-xs text-[var(--nb-ink)]">
                3
              </span>
              <span className="nb-mono text-xs font-bold uppercase text-[var(--nb-ink)]">
                Cited rule
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-[var(--nb-yellow)] border-2 border-[var(--nb-ink)] flex items-center justify-center nb-mono font-black text-xs text-[var(--nb-ink)]">
                4
              </span>
              <span className="nb-mono text-xs font-bold uppercase text-[var(--nb-ink)]">
                One-click action
              </span>
            </div>
          </div>
        </div>

        {/* Footnote */}
        <p className="nb-mono text-sm sm:text-base text-[var(--nb-ink)] opacity-90 font-medium">
          Illustration using a fictional brand.
        </p>
      </div>
    </section>
  );
}
