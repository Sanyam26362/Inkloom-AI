import React from "react";

export function ValueTable() {
  const comparisonRows = [
    {
      metric: "Time to first feedback",
      manual: "Hours to days",
      inkloom: "Minutes",
    },
    {
      metric: "Consistency",
      manual: "Depends on the reviewer",
      inkloom: "Same rules, every time",
    },
    {
      metric: "Coverage",
      manual: "Samples of assets",
      inkloom: "Every asset",
    },
    {
      metric: "Evidence",
      manual: "Email threads",
      inkloom: "Cited rule per finding",
    },
    {
      metric: "Audit trail",
      manual: "Scattered",
      inkloom: "Built in",
    },
    {
      metric: "Formats",
      manual: "Mostly text and images",
      inkloom: "Text, image, audio, video",
    },
  ];

  return (
    <section
      aria-labelledby="value-table-heading"
      className="w-full bg-[var(--nb-cream)] nb-section-separator py-16 sm:py-24 px-6 sm:px-10 lg:px-16"
    >
      <div className="max-w-[1280px] mx-auto">
        <span className="nb-eyebrow mb-6">WHY TEAMS SWITCH</span>
        <h2 id="value-table-heading" className="nb-h2 mb-12 sm:mb-16 text-[var(--nb-ink)]">
          MANUAL REVIEW VS BRANDLENS.
        </h2>

        {/* Scrollable table container */}
        <div className="overflow-x-auto border-[3px] border-[var(--nb-ink)] shadow-[6px_6px_0_var(--nb-ink)] mb-6 bg-white">
          <table className="w-full min-w-[640px] border-collapse text-left nb-mono">
            <thead>
              <tr className="bg-[var(--nb-ink)] text-[var(--nb-cream)] border-b-[3px] border-[var(--nb-ink)]">
                <th className="py-4 px-6 text-sm font-bold uppercase tracking-wider w-1/3 border-r-[3px] border-[var(--nb-ink)]">
                  CRITERIA
                </th>
                <th className="py-4 px-6 text-sm font-bold uppercase tracking-wider w-1/3 border-r-[3px] border-[var(--nb-ink)]">
                  MANUAL REVIEW
                </th>
                <th className="py-4 px-6 text-sm font-bold uppercase tracking-wider w-1/3 bg-[#0d2a12] text-[var(--nb-green)]">
                  BRANDLENS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-[3px] divide-[var(--nb-ink)]">
              {comparisonRows.map((row, idx) => (
                <tr key={idx} className="divide-x-[3px] divide-[var(--nb-ink)]">
                  {/* Metric column */}
                  <td className="py-4 px-6 text-sm sm:text-base font-bold text-[var(--nb-ink)] bg-white">
                    {row.metric}
                  </td>

                  {/* Manual Review (White) */}
                  <td className="py-4 px-6 text-sm sm:text-base font-medium text-[var(--nb-ink)] bg-white opacity-85">
                    {row.manual}
                  </td>

                  {/* BrandLens (Green) */}
                  <td className="py-4 px-6 text-sm sm:text-base font-bold text-[var(--nb-ink)] bg-[var(--nb-green)]">
                    <span className="flex items-center gap-2">
                      <span className="text-[var(--nb-ink)]">✓</span>
                      {row.inkloom}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footnote */}
        <p className="nb-mono text-sm sm:text-base text-[var(--nb-ink)] opacity-90 font-medium">
          Qualitative comparison. Results vary by team and content volume.
        </p>
      </div>
    </section>
  );
}
