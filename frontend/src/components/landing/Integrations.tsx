import React from "react";

export function Integrations() {
  const integrations = [
    { label: "REST API", status: "AVAILABLE ON REQUEST", chipColor: "bg-[var(--nb-yellow)]" },
    { label: "Slack", status: "ROADMAP", chipColor: "bg-[#e0deda]" },
    { label: "Google Drive", status: "ROADMAP", chipColor: "bg-[#e0deda]" },
    { label: "Figma", status: "ROADMAP", chipColor: "bg-[#e0deda]" },
    { label: "Canva", status: "ROADMAP", chipColor: "bg-[#e0deda]" },
    { label: "Digital asset managers", status: "ROADMAP", chipColor: "bg-[#e0deda]" },
    { label: "Webhooks", status: "ROADMAP", chipColor: "bg-[#e0deda]" },
    { label: "SSO / SCIM", status: "ROADMAP", chipColor: "bg-[#e0deda]" },
  ];

  return (
    <section
      aria-labelledby="integrations-heading"
      className="w-full bg-[var(--nb-cream)] nb-section-separator py-16 sm:py-24 px-6 sm:px-10 lg:px-16"
    >
      <div className="max-w-[1280px] mx-auto">
        <span className="nb-eyebrow mb-6">ECOSYSTEM</span>
        <h2 id="integrations-heading" className="nb-h2 mb-12 sm:mb-16 text-[var(--nb-ink)]">
          FITS WHERE YOUR TEAM ALREADY WORKS.
        </h2>

        {/* 8 Tiles Grid (Text labels only, no logos) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {integrations.map((item) => (
            <div
              key={item.label}
              className="nb-card bg-white p-6 flex flex-col justify-between min-h-[140px]"
            >
              <h3 className="nb-mono text-lg font-bold text-[var(--nb-ink)]">
                {item.label}
              </h3>

              <div className="pt-4 border-t-2 border-[var(--nb-ink)] border-dashed flex justify-start">
                <span
                  className={`nb-mono text-[11px] font-bold ${item.chipColor} text-[var(--nb-ink)] border border-[var(--nb-ink)] px-2 py-0.5 uppercase tracking-wider`}
                >
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA line */}
        <div className="border-l-[4px] border-[var(--nb-ink)] pl-4 sm:pl-6 py-1">
          <p className="nb-mono text-base font-bold text-[var(--nb-ink)]">
            Need a specific integration? Tell us in the demo form.
          </p>
        </div>
      </div>
    </section>
  );
}
