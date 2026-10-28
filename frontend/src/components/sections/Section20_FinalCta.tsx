"use client";

import React from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";

export function Section20_FinalCta() {
  const { openAuthModal } = useApp();
  return (
    <section className="py-24 bg-background text-center font-sans text-base leading-[1.4] text-text-primary">
      <div className="max-w-[800px] mx-auto px-4 sm:px-6">
        <h2 className="mb-4 font-serif text-4xl leading-[1.2] text-equally-action-color font-bold">
          The stage is set
        </h2>

        <p className="mb-8 font-sans text-base leading-[1.4] text-text-muted">
          Start for free, upgrade anytime. No credit card needed.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <button
            type="button"
            onClick={() => openAuthModal()}
            className="w-full sm:w-auto flex justify-center items-center px-12 py-3.5 font-sans text-base font-bold leading-[1.4] text-center text-background bg-primary hover:bg-[#004578] rounded-full cursor-pointer transition-all duration-300 shadow-sm"
          >
            Start Now
          </button>

          <Link
            href="/audit"
            className="w-full sm:w-auto flex justify-center items-center px-12 py-3.5 font-sans text-base font-bold leading-[1.4] text-center text-primary border-2 border-primary rounded-full hover:bg-blue-50/60 transition-all duration-300 cursor-pointer"
          >
            Open Audit Workspace
          </Link>
        </div>

        <p className="font-sans text-2xs leading-[1.4] text-text-muted">
          Pre-seeded with Blinkit brand benchmark • pgvector RAG active • Instant console access
        </p>
      </div>
    </section>
  );
}
