"use client";

import React from "react";

export function Section9_RolesGrid() {
  const roles = [
    {
      title: "Content Creators",
      subtitle: "Instant pre-publication feedback",
      desc: "Draft marketing copy, Instagram captions, and video scripts with real-time detection of banned words, tone shifts, and unverified claims.",
      icon: (
        <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      ),
    },
    {
      title: "Reviewers & Editors",
      subtitle: "Pinpoint guideline violations",
      desc: "Review severity-graded findings (Critical, Warning, Suggestion), cross-reference matched guideline chunks, and approve revisions in one click.",
      icon: (
        <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
    },
    {
      title: "Brand Managers",
      subtitle: "Maintain strict identity coherence",
      desc: "Ingest brand guideline PDFs, define approved hex palettes, configure banned terms, and override edge cases with mandatory audit justifications.",
      icon: (
        <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: "Legal & Compliance",
      subtitle: "Audit-ready defense & evidence",
      desc: "Verify approved legal disclaimers and claim substantiations with permanent, immutable audit events generated for every approval.",
      icon: (
        <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="-mt-10 -mb-15 font-sans text-base leading-[1.4] text-text-primary bg-background py-16">
      <div className="max-w-[1164px] mx-auto px-4 sm:px-6">
        <h2 className="shrink-0 mb-[23px] px-[15px] max-w-full font-serif text-2xl leading-[1.2] text-center text-equally-action-color font-bold">
          Speed up approvals for every reviewer on your team
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
          {roles.map((role, idx) => (
            <div
              key={idx}
              className="flex flex-col p-6 rounded-sm bg-palette-7/30 border border-border hover:bg-background hover:border-primary/40 hover:shadow-sm transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-sm bg-background border border-border flex items-center justify-center mb-4 shadow-2xs">
                {role.icon}
              </div>
              <h3 className="font-sans text-base font-bold leading-[1.4] text-equally-action-color mb-1">
                {role.title}
              </h3>
              <p className="font-sans text-xs font-bold leading-[1.4] text-primary mb-2">
                {role.subtitle}
              </p>
              <p className="font-sans text-xs leading-[1.4] text-text-muted">
                {role.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
