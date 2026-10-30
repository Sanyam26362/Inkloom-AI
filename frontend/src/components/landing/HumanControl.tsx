import React from "react";

export function HumanControl() {
  const tiles = [
    {
      title: "ACCEPT THE FIX.",
      desc: "One click applies the suggested correction and logs who did it.",
    },
    {
      title: "OVERRIDE WITH A REASON.",
      desc: "Business exceptions are allowed, but only with a written justification attached to the finding.",
    },
    {
      title: "FAIL-CLOSED BY DESIGN.",
      desc: "If the AI times out or errors, the asset is blocked, not silently passed.",
    },
    {
      title: "FULL AUDIT TRAIL.",
      desc: "Every submission, finding, fix and override is recorded: who, what, when, why.",
    },
  ];

  const timeline = [
    {
      event: "CREATED",
      time: "10:14:02 AM",
      role: "CREATOR",
      roleBg: "bg-[var(--nb-blue)]",
    },
    {
      event: "AUDIT_COMPLETED",
      time: "10:14:08 AM",
      role: "SYSTEM_AI",
      roleBg: "bg-[var(--nb-pink)]",
    },
    {
      event: "FIX_ACCEPTED",
      time: "10:18:22 AM",
      role: "REVIEWER",
      roleBg: "bg-[var(--nb-yellow)]",
    },
    {
      event: "FINDING_OVERRIDDEN (reason on file)",
      time: "10:22:45 AM",
      role: "COMPLIANCE_LEAD",
      roleBg: "bg-[var(--nb-orange)]",
    },
    {
      event: "APPROVED",
      time: "10:24:10 AM",
      role: "BRAND_JUDGE",
      roleBg: "bg-[var(--nb-green)]",
    },
  ];

  return (
    <section
      aria-labelledby="governance-heading"
      className="w-full bg-[var(--nb-yellow)] nb-section-separator py-16 sm:py-24 px-6 sm:px-10 lg:px-16"
    >
      <div className="max-w-[1280px] mx-auto">
        <span className="nb-eyebrow mb-6 bg-white px-2 py-0.5 border border-[var(--nb-ink)]">
          GOVERNANCE
        </span>

        <h2 id="governance-heading" className="nb-h2 mb-6 text-[var(--nb-ink)]">
          AI FLAGS. HUMANS DECIDE.
        </h2>

        <p className="nb-mono text-base sm:text-lg max-w-3xl text-[var(--nb-ink)] font-bold mb-12 sm:mb-16">
          Inkloom never approves content on its own authority. People stay accountable, and the record proves it.
        </p>

        {/* 2-Column: 4 Tiles Left, Vertical Timeline Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Four White Tiles (2x2) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {tiles.map((tile, idx) => (
              <div
                key={idx}
                className="nb-card bg-white p-6 sm:p-7 flex flex-col justify-between min-h-[190px]"
              >
                <h3 className="nb-mono text-base sm:text-lg font-bold uppercase tracking-tight text-[var(--nb-ink)] mb-3">
                  {tile.title}
                </h3>
                <p className="nb-mono text-sm leading-relaxed text-[var(--nb-ink)] opacity-90 font-medium">
                  {tile.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Vertical Timeline inside a Bordered Card */}
          <div className="lg:col-span-5 nb-card bg-white p-6 sm:p-8">
            <div className="border-b-[3px] border-[var(--nb-ink)] pb-3 mb-6 flex items-center justify-between">
              <span className="nb-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--nb-ink)]">
                AUDIT TRAIL LOG
              </span>
              <span className="nb-chip nb-chip-pass text-[10px]">
                TAMPER-EVIDENT
              </span>
            </div>

            <div className="relative flex flex-col">
              {/* Vertical line through points */}
              <div
                aria-hidden="true"
                className="absolute top-2 bottom-4 left-[15px] w-[3px] bg-[var(--nb-ink)]"
              ></div>

              <div className="flex flex-col gap-6">
                {timeline.map((item, idx) => (
                  <div key={idx} className="relative flex items-start gap-4">
                    {/* Circle Node */}
                    <div className="relative z-10 w-8 h-8 rounded-none bg-white border-[3px] border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)] flex items-center justify-center font-bold text-xs shrink-0 select-none">
                      {idx + 1}
                    </div>

                    {/* Timeline Event Details */}
                    <div className="flex-1 border-2 border-[var(--nb-ink)] p-3 bg-[var(--nb-cream)] shadow-[2px_2px_0_var(--nb-ink)]">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <span
                          className={`nb-mono text-[10px] font-bold border border-[var(--nb-ink)] px-1.5 py-0.5 ${item.roleBg} text-[var(--nb-ink)]`}
                        >
                          {item.role}
                        </span>
                        <span className="nb-mono text-xs sm:text-sm font-semibold text-[var(--nb-ink)] opacity-90">
                          {item.time}
                        </span>
                      </div>
                      <p className="nb-mono text-sm sm:text-base font-bold text-[var(--nb-ink)] uppercase">
                        {item.event}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
