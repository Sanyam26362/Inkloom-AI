import React from "react";

export function HowItWorks() {
  const steps = [
    {
      num: "01 / INGEST",
      title: "DROP IT IN.",
      desc: "Upload your brand guidelines as a PDF or text. BrandLens turns them into a reviewable ruleset: colours, banned terms, required phrases, tone and format limits.",
      stepLabel: "Step 1 of 3",
      bgColor: "bg-[var(--nb-pink)]",
    },
    {
      num: "02 / INSPECT",
      title: "AI READS EVERYTHING.",
      desc: "Submit any asset. Rule checks, contrast maths, language models and vision models run in parallel. Every finding cites the rule it breaks.",
      stepLabel: "Step 2 of 3",
      bgColor: "bg-[var(--nb-orange)]",
    },
    {
      num: "03 / RESOLVE",
      title: "FIX WHAT'S WRONG.",
      desc: "Accept the suggested fix or override it with a written reason. Content is approved only when every finding is resolved.",
      stepLabel: "Step 3 of 3",
      bgColor: "bg-[var(--nb-green)]",
    },
  ];

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="w-full bg-[var(--nb-cream)] nb-section-separator py-16 sm:py-24 px-6 sm:px-10 lg:px-16"
    >
      <div className="max-w-[1280px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 sm:mb-16">
          <div>
            <span className="nb-eyebrow mb-6">HOW IT WORKS</span>
            <h2 id="how-it-works-heading" className="nb-h2 text-[var(--nb-ink)]">
              FROM UPLOAD TO ALL-CLEAR.
            </h2>
          </div>

          {/* Right-aligned pull quote with left ink rule */}
          <div className="border-l-[4px] border-[var(--nb-ink)] pl-4 py-1 self-start md:self-end">
            <p className="nb-mono text-sm sm:text-base font-bold text-[var(--nb-ink)] uppercase leading-snug">
              One hard-working system.<br />
              Zero fuzzy standards.
            </p>
          </div>
        </div>

        {/* Three equal cards in one bordered row (no gaps, shared borders) */}
        <div className="border-[3px] border-[var(--nb-ink)] shadow-[6px_6px_0_var(--nb-ink)] grid grid-cols-1 md:grid-cols-3 divide-y-[3px] md:divide-y-0 md:divide-x-[3px] divide-[var(--nb-ink)]">
          {steps.map((step) => (
            <div
              key={step.num}
              className={`${step.bgColor} p-6 sm:p-8 flex flex-col justify-between min-h-[320px]`}
            >
              <div>
                {/* Label Row */}
                <div className="border-b-[3px] border-[var(--nb-ink)] pb-3 mb-6">
                  <span className="nb-mono text-xs sm:text-sm font-bold tracking-widest text-[var(--nb-ink)] uppercase">
                    {step.num}
                  </span>
                </div>

                {/* Title */}
                <h3
                  className="text-2xl sm:text-3xl text-[var(--nb-ink)] uppercase mb-4"
                  style={{ fontFamily: "var(--font-archivo), sans-serif", fontWeight: 900 }}
                >
                  {step.title}
                </h3>

                {/* Description */}
                <p className="nb-mono text-sm sm:text-base leading-relaxed text-[var(--nb-ink)] font-medium">
                  {step.desc}
                </p>
              </div>

              {/* Bottom Caption */}
              <div className="mt-8 pt-4 border-t-2 border-[var(--nb-ink)] border-dashed">
                <span className="nb-mono text-sm sm:text-base font-bold text-[var(--nb-ink)] uppercase tracking-wider opacity-90">
                  {step.stepLabel}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
