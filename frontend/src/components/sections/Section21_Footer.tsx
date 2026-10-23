"use client";

import React from "react";
import Link from "next/link";

export function Section21_Footer() {
  const footerColumns = [
    {
      title: "Platform",
      links: [
        { label: "Content Audit Workspace", href: "/audit" },
        { label: "Brand Guidelines Management", href: "/guidelines" },
        { label: "Governance Console", href: "/dashboard" },
        { label: "System Health Diagnostics", href: "http://localhost:8000/api/v1/health" },
      ],
    },
    {
      title: "Multi-Modal QA",
      links: [
        { label: "Text & Markdown Auditing", href: "/audit" },
        { label: "Audio Voiceover Transcription", href: "/audit" },
        { label: "Video Reel Dialogue & Captions", href: "/audit" },
        { label: "Guideline PDF Ingestion", href: "/guidelines" },
      ],
    },
    {
      title: "Architecture",
      links: [
        { label: "Deterministic Rule Engine", href: "#" },
        { label: "pgvector 768d Cosine Search", href: "#" },
        { label: "Reverse-Offset PII Scrubber", href: "#" },
        { label: "Redis Caching Tier", href: "#" },
      ],
    },
    {
      title: "API & Devs",
      links: [
        { label: "Swagger UI Docs", href: "http://localhost:8000/docs" },
        { label: "ReDoc Specification", href: "http://localhost:8000/redoc" },
        { label: "OpenAPI JSON Endpoint", href: "http://localhost:8000/api/v1/openapi.json" },
        { label: "Automated Pytest Suite", href: "#" },
      ],
    },
  ];

  return (
    <footer className="pt-16 pb-10 bg-palette-7/30 border-t border-border font-sans text-base leading-[1.4] text-text-primary">
      <div className="max-w-[1246px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 mb-12">
          {/* Logo & Description */}
          <div className="lg:col-span-2 flex flex-col items-start">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-sm bg-primary flex items-center justify-center text-background font-bold text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="font-serif text-xl font-bold text-equally-action-color">
                Inkloom AI
              </span>
            </Link>
            <p className="font-sans text-xs leading-[1.4] text-text-muted mb-6 max-w-[320px]">
              Enterprise Brand Identity Governance, Computational Policy Adherence &amp; Multi-Modal Content Auditing Platform.
            </p>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-6 py-2.5 bg-primary hover:bg-[#004578] text-background text-xs font-bold rounded-xl shadow-2xs transition-all"
            >
              Start Now
            </Link>
          </div>

          {/* Links Columns */}
          {footerColumns.map((col, idx) => (
            <div key={idx} className="flex flex-col">
              <h4 className="font-sans text-xs font-bold leading-[1.4] text-equally-action-color uppercase tracking-wider mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link, lIdx) => (
                  <li key={lIdx}>
                    <a
                      href={link.href}
                      className="font-sans text-xs leading-[1.4] text-text-muted hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
