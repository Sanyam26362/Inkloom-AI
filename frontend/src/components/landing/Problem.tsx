import React from "react";

export function Problem() {
  const cards = [
    {
      num: "01",
      title: "Review doesn't scale.",
      body: "Every campaign needs someone to read the guideline PDF, remember it, and check each asset by eye. Volume grows. Reviewers don't.",
    },
    {
      num: "02",
      title: "Rules live in documents, not in the workflow.",
      body: "Banned terms, required disclaimers and colour specs sit in a PDF nobody opens at 11pm before launch.",
    },
    {
      num: "03",
      title: "No paper trail.",
      body: "When legal asks who approved a claim, and why, the answer is a buried email thread.",
    },
  ];

  return (
    <section
      aria-labelledby="problem-heading"
      className="w-full bg-[var(--nb-cream)] nb-section-separator py-16 sm:py-24 px-6 sm:px-10 lg:px-16"
    >
      <div className="max-w-[1280px] mx-auto">
        <span className="nb-eyebrow mb-6">THE PROBLEM</span>

        <h2 id="problem-heading" className="nb-h2 mb-12 sm:mb-16 max-w-4xl text-[var(--nb-ink)]">
          OFF-BRAND CONTENT SHIPS FAST. FIXING IT SHIPS SLOW.
        </h2>

        {/* 3 White Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {cards.map((card) => (
            <div
              key={card.num}
              className="nb-card p-6 sm:p-8 flex flex-col justify-between bg-white"
            >
              <div>
                <span className="nb-mono text-4xl sm:text-5xl font-black text-[var(--nb-ink)] block mb-6 select-none opacity-90">
                  {card.num}
                </span>
                <h3 className="nb-mono text-lg sm:text-xl font-bold uppercase tracking-tight text-[var(--nb-ink)] mb-4">
                  {card.title}
                </h3>
              </div>
              <p className="nb-mono text-sm sm:text-base leading-relaxed text-[var(--nb-ink)] font-normal opacity-95">
                {card.body}
              </p>
            </div>
          ))}
        </div>

        {/* Closing Line with Left Ink Rule */}
        <div className="border-l-[4px] border-[var(--nb-ink)] pl-4 sm:pl-6 py-2">
          <p className="nb-mono text-base sm:text-lg font-bold uppercase tracking-wide text-[var(--nb-ink)]">
            Brand risk is a process problem. Treat it like one.
          </p>
        </div>
      </div>
    </section>
  );
}
