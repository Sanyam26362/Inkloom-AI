import React from "react";

export function Trust() {
  const inProductItems = [
    "Role-based access (Creator, Judge, Admin)",
    "Token-based authenticated sessions",
    "PII scrubbing before content reaches the model",
    "Fail-closed AI behaviour",
    "Concurrency-safe review locking",
    "Immutable-style audit log of workflow events",
  ];

  const roadmapItems = [
    "Single sign-on (SSO)",
    "SOC 2",
    "Data-residency options",
  ];

  return (
    <section
      id="trust"
      aria-labelledby="trust-heading"
      className="w-full bg-[var(--nb-green)] nb-section-separator py-16 sm:py-24 px-6 sm:px-10 lg:px-16"
    >
      <div className="max-w-[1280px] mx-auto">
        <span className="nb-eyebrow mb-6 bg-white px-2 py-0.5 border border-[var(--nb-ink)]">
          TRUST & SECURITY
        </span>

        <h2 id="trust-heading" className="nb-h2 mb-12 sm:mb-16 text-[var(--nb-ink)]">
          CONTROLS YOU CAN VERIFY.
        </h2>

        {/* 2-Column: In the product today vs Roadmap */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8 items-start">
          {/* Left Column: In the product today (7 cols) */}
          <div className="lg:col-span-7">
            <div className="border-b-[3px] border-[var(--nb-ink)] pb-3 mb-6">
              <span className="nb-mono text-sm font-bold uppercase tracking-wider text-[var(--nb-ink)]">
                IN THE PRODUCT TODAY
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {inProductItems.map((item, idx) => (
                <div
                  key={idx}
                  className="nb-card bg-white p-5 flex flex-col justify-between min-h-[110px]"
                >
                  <span className="nb-mono text-sm font-bold text-[var(--nb-ink)] opacity-80 mb-2">
                    0{idx + 1}
                  </span>
                  <p className="nb-mono text-sm sm:text-base font-bold text-[var(--nb-ink)] leading-snug">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Roadmap (5 cols) */}
          <div className="lg:col-span-5">
            <div className="border-b-[3px] border-[var(--nb-ink)] pb-3 mb-6">
              <span className="nb-mono text-sm font-bold uppercase tracking-wider text-[var(--nb-ink)]">
                ROADMAP
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {roadmapItems.map((item, idx) => (
                <div
                  key={idx}
                  className="nb-card-placeholder bg-white p-5 flex items-center justify-between shadow-[4px_4px_0_var(--nb-ink)]"
                >
                  <p className="nb-mono text-sm sm:text-base font-bold text-[var(--nb-ink)]">
                    {item}
                  </p>
                  <span className="nb-mono text-xs sm:text-sm font-bold bg-[#e0deda] text-[var(--nb-ink)] border border-[var(--nb-ink)] px-2.5 py-1 uppercase tracking-wider">
                    ROADMAP
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footnote */}
        <p className="nb-mono text-sm sm:text-base text-[var(--nb-ink)] font-bold">
          We list roadmap items as roadmap items. No certification is claimed until it is earned.
        </p>
      </div>
    </section>
  );
}
