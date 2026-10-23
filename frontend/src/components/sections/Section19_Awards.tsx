"use client";

import React from "react";

export function Section19_Awards() {
  const awards = [
    { title: "27 / 27 Endpoints", sub: "100% Verified REST API", year: "FastAPI" },
    { title: "Zero PII Leakage", sub: "Reverse-Offset Sanitizer", year: "Secured" },
    { title: "pgvector RAG", sub: "768-dim Cosine Distance", year: "PostgreSQL" },
    { title: "Multi-Modal QA", sub: "Text, Audio & Video Reels", year: "Full Stack" },
    { title: "52 / 52 Test Pass", sub: "Comprehensive Pytest Suite", year: "100% Verified" },
  ];

  return (
    <section className="py-14 bg-palette-7/30 border-y border-palette-1 font-sans text-base leading-[1.4] text-text-primary">
      <div className="max-w-[1164px] mx-auto px-4 sm:px-6 text-center">
        <p className="font-sans text-2xs font-bold uppercase tracking-widest text-text-muted mb-8">
          Architectural Rigor, Automated Quality Assurance &amp; Defensible Engineering
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {awards.map((award, idx) => (
            <div
              key={idx}
              className="px-6 py-4 bg-background rounded-sm border border-border shadow-2xs flex flex-col items-center min-w-[170px]"
            >
              <div className="w-8 h-8 rounded-full bg-palette-14 text-primary flex items-center justify-center mb-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="font-sans text-xs font-bold leading-[1.4] text-equally-action-color">
                {award.title}
              </span>
              <span className="font-sans text-3xs leading-[1.4] text-text-muted">
                {award.sub}
              </span>
              <span className="text-3xs font-semibold text-primary mt-1 uppercase">
                {award.year}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
