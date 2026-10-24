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
    <section className="py-20 bg-background font-sans text-base leading-[1.4] text-text-primary">
      <div className="max-w-[1164px] mx-auto px-4 sm:px-6">
        <div className="text-center mb-14 max-w-[800px] mx-auto">
          <h2 className="font-serif text-2xl font-bold leading-[1.2] text-equally-action-color mb-4">
            Fits seamlessly into your team’s existing workflow
          </h2>
          <p className="font-sans text-base leading-[1.4] text-text-muted">
            Connect Inkloom AI with your project management, creative, and collaboration tools so approvals stay in sync across your workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {categories.map((cat, idx) => (
            <div
              key={idx}
              className="flex flex-col shrink-0 px-10 py-8 font-sans text-base leading-[1.4] text-text-primary border-[0.67px] border-border rounded-sm bg-palette-7/20 hover:bg-background hover:shadow-sm transition-all duration-300 justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-sans text-base font-bold leading-[1.4] text-equally-action-color">
                    {cat.title}
                  </h3>
                  <span className="text-3xs font-semibold px-2 py-0.5 rounded-sm bg-palette-14 text-primary">
                    {cat.badge}
                  </span>
                </div>
                <p className="font-sans text-base leading-[1.4] text-text-muted mb-6">
                  {cat.desc}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-palette-1">
                {cat.apps.map((app, aIdx) => (
                  <span
                    key={aIdx}
                    className="text-2xs font-normal px-3 py-1 bg-background border border-border rounded-sm text-text-primary"
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
