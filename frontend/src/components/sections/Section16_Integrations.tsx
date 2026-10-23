"use client";

import React from "react";

export function Section16_Integrations() {
  const categories = [
    {
      title: "Vector Search & Caching",
      desc: "PostgreSQL 16 with pgvector v0.8.7 for 768-dim cosine similarity retrieval, paired with Redis 7 for high-throughput rule caching.",
      badge: "pgvector & Redis",
      apps: ["PostgreSQL", "pgvector", "Redis", "Async SQLAlchemy", "Alembic"],
    },
    {
      title: "Multi-Modal AI Engines",
      desc: "Google GenAI SDK (Gemini 3.5 Flash & Gemini Embedding 2) with fast fallback to Groq for sub-second semantic evaluation.",
      badge: "GenAI & Groq",
      apps: ["Google GenAI", "Gemini 3.5", "Groq", "PyMuPDF", "Pillow"],
    },
    {
      title: "Collateral Formats Supported",
      desc: "Audits text copy, Markdown documents, HTML emails, voiceover audio tracks, and full video reels with synchronized captions.",
      badge: "Multi-Modal",
      apps: ["Text / Markdown", "HTML Collateral", "MP3 / WAV Audio", "MP4 / MOV Video", "PDF Guidelines"],
    },
    {
      title: "Enterprise REST API",
      desc: "FastAPI architecture providing 27 fully tested endpoints, OpenAPI JSON specs, and RBAC authentication headers.",
      badge: "27 Endpoints",
      apps: ["FastAPI", "OpenAPI", "Pydantic v2", "Pytest Suite", "Docker"],
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-[1164px] mx-auto px-4 sm:px-6">
        <div className="text-center mb-14 max-w-[800px] mx-auto">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-[#005797] text-xs font-bold uppercase tracking-wider mb-3">
            Technology Stack &amp; Infrastructure
          </span>
          <h2 className="font-['Domine',serif] text-2xl sm:text-[31px] font-bold text-[#111827] leading-[1.25] mb-4">
            Built on modern, high-performance infrastructure
          </h2>
          <p className="font-['Lato',sans-serif] text-base sm:text-lg text-[#4b5563] leading-relaxed">
            Inkloom AI connects asynchronous Python services, pgvector embeddings, and multi-modal models to ensure your brand rules run with sub-second latency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {categories.map((cat, idx) => (
            <div
              key={idx}
              className="p-8 rounded-2xl bg-[#f9fafb] border border-gray-200/80 hover:bg-white hover:border-[#005797]/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-['Lato',sans-serif] text-xl font-bold text-[#111827]">
                    {cat.title}
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-100/60 text-[#005797]">
                    {cat.badge}
                  </span>
                </div>
                <p className="font-['Lato',sans-serif] text-sm sm:text-base text-[#4b5563] leading-relaxed mb-6">
                  {cat.desc}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-200/60">
                {cat.apps.map((app, aIdx) => (
                  <span
                    key={aIdx}
                    className="text-xs font-medium px-3 py-1 bg-white border border-gray-200 rounded-full text-gray-700 shadow-2xs"
                  >
                    {app}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
