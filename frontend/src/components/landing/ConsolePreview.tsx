"use client";

import React from "react";

export function ConsolePreview() {
  const handleWalkthroughClick = () => {
    const demoEl = document.getElementById("demo");
    if (demoEl) {
      demoEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const queueRows = [
    { name: "autumn_campaign_v2.mp4", role: "CREATIVE", status: "PENDING", age: "12m ago", chip: "nb-chip-warning" },
    { name: "press_release_q4.docx", role: "MARKETING", status: "FAILED", age: "34m ago", chip: "nb-chip-critical" },
    { name: "hero_banner_mobile.png", role: "AGENCY", status: "PASSED", age: "1h ago", chip: "nb-chip-pass" },
    { name: "tiktok_soundbite_03.wav", role: "CREATIVE", status: "REVIEW", age: "2h ago", chip: "nb-chip-suggestion" },
  ];

  const violations = [
    { category: "TONE", pct: 68, color: "bg-[var(--nb-pink)]" },
    { category: "TERMINOLOGY", pct: 84, color: "bg-[var(--nb-orange)]" },
    { category: "FACTUAL_CLAIM", pct: 42, color: "bg-[var(--nb-red)]" },
    { category: "VISUAL", pct: 55, color: "bg-[var(--nb-yellow)]" },
    { category: "ACCESSIBILITY", pct: 30, color: "bg-[var(--nb-blue)]" },
  ];

  return (
    <section
      aria-labelledby="console-heading"
      className="w-full bg-[var(--nb-ink)] text-[var(--nb-cream)] nb-section-separator py-16 sm:py-24 px-6 sm:px-10 lg:px-16"
    >
      <div className="max-w-[1280px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <span className="nb-eyebrow text-[var(--nb-cream)] border-b-2 border-[var(--nb-yellow)]">
            GOVERNANCE CONSOLE
          </span>
          <span className="nb-mono text-xs sm:text-sm font-bold bg-white text-[var(--nb-ink)] px-3 py-1 border border-white self-start sm:self-auto">
            Sample data
          </span>
        </div>

        <h2 id="console-heading" className="nb-h2 mb-6 text-[var(--nb-cream)]">
          SEE EVERY RISK. IN ONE CONSOLE.
        </h2>

        <p className="nb-mono text-base sm:text-lg max-w-3xl text-[var(--nb-cream)] opacity-95 font-medium mb-12 sm:mb-16">
          Leaders get a live view of what is waiting, what is failing, and where the AI and your reviewers disagree.
        </p>

        {/* Three Stylised Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          {/* Widget 1: LIVE QUEUE (6 cols) */}
          <div className="lg:col-span-6 bg-[#1a1a1a] border-[3px] border-white p-6 shadow-[6px_6px_0_#ffffff] text-white">
            <div className="flex items-center justify-between pb-3 border-b-2 border-white mb-4">
              <span className="nb-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--nb-yellow)]">
                LIVE QUEUE
              </span>
              <span className="nb-mono text-xs sm:text-sm text-white/80 font-medium">
                4 Active Assets
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left nb-mono text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-white/20 text-white/80 text-xs sm:text-sm">
                    <th className="pb-2 font-bold">ASSET</th>
                    <th className="pb-2 font-bold">SUBMITTER</th>
                    <th className="pb-2 font-bold">STATUS</th>
                    <th className="pb-2 font-bold">AGE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {queueRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="py-2.5 font-bold truncate max-w-[160px]">
                        {row.name}
                      </td>
                      <td className="py-2.5 text-white/90">
                        {row.role}
                      </td>
                      <td className="py-2.5">
                        <span className={`nb-chip ${row.chip} text-xs py-0.5 px-2`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-white/80">
                        {row.age}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Widget 2: POLICY VIOLATIONS (3 cols) */}
          <div className="lg:col-span-3 bg-[#1a1a1a] border-[3px] border-white p-6 shadow-[6px_6px_0_#ffffff] text-white flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b-2 border-white mb-5">
                <span className="nb-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--nb-pink)]">
                  POLICY VIOLATIONS
                </span>
                <span className="nb-mono text-xs sm:text-sm text-white/80 font-medium">
                  Last 30D
                </span>
              </div>

              <div className="flex flex-col gap-4">
                {violations.map((v) => (
                  <div key={v.category} className="flex flex-col gap-1.5">
                    <div className="flex justify-between nb-mono text-xs sm:text-sm font-bold">
                      <span>{v.category}</span>
                      <span className="text-white/85">{v.pct}%</span>
                    </div>
                    {/* Horizontal Bar */}
                    <div className="w-full h-3 bg-white/20 border border-white">
                      <div
                        className={`h-full ${v.color}`}
                        style={{ width: `${v.pct}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/20 mt-4">
              <span className="nb-mono text-xs text-white/80 uppercase font-medium">
                Aggregated cross-campaign metrics
              </span>
            </div>
          </div>

          {/* Widget 3: AI AGREEMENT RATE (3 cols) */}
          <div className="lg:col-span-3 bg-[var(--nb-yellow)] border-[3px] border-white p-6 shadow-[6px_6px_0_#ffffff] text-[var(--nb-ink)] flex flex-col justify-between">
            <div>
              <div className="border-b-[3px] border-[var(--nb-ink)] pb-3 mb-6">
                <span className="nb-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--nb-ink)]">
                  AI AGREEMENT RATE
                </span>
              </div>

              {/* Big Number Tile (styled as sample data 00%) */}
              <div className="py-4 text-center">
                <span
                  className="text-6xl sm:text-7xl font-black text-[var(--nb-ink)] tracking-tighter"
                  style={{ fontFamily: "var(--font-archivo), sans-serif" }}
                >
                  00%
                </span>
              </div>

              <p className="nb-mono text-sm sm:text-base font-bold text-[var(--nb-ink)] text-center leading-snug">
                How often reviewers accept AI findings
              </p>
            </div>

            <div className="pt-4 border-t-2 border-[var(--nb-ink)] border-dashed mt-4 text-center">
              <span className="nb-mono text-xs uppercase font-bold text-[var(--nb-ink)] opacity-85">
                Calibrated against brand baseline
              </span>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div>
          <button
            type="button"
            onClick={handleWalkthroughClick}
            className="nb-btn nb-btn-accent"
          >
            BOOK A WALKTHROUGH →
          </button>
        </div>
      </div>
    </section>
  );
}
