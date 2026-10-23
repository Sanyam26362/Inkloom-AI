"use client";

import React from "react";
import Link from "next/link";

export function Section20_FinalCta() {
  return (
    <section className="py-24 bg-white text-center">
      <div className="max-w-[800px] mx-auto px-4 sm:px-6">
        <h2 className="font-['Domine',serif] text-3xl sm:text-4xl lg:text-[45px] font-bold text-[#111827] leading-[1.2] mb-4">
          Automate your brand governance today
        </h2>

        <p className="font-['Lato',sans-serif] text-lg sm:text-[20px] text-[#4b5563] mb-8 leading-normal">
          Audit collateral instantly, enforce prohibited terms, and defend your brand identity at scale.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex justify-center items-center px-12 py-4 font-['Lato',sans-serif] text-lg font-bold text-white bg-[#005797] hover:bg-[#004578] rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            Start Now
          </Link>

          <Link
            href="/audit"
            className="w-full sm:w-auto inline-flex justify-center items-center px-10 py-4 font-['Lato',sans-serif] text-lg font-bold text-[#005797] hover:text-[#004578] bg-transparent border-2 border-[#005797] hover:border-[#004578] rounded-full hover:bg-blue-50/60 transition-all duration-300 cursor-pointer"
          >
            Open Audit Workspace
          </Link>
        </div>

        <p className="font-['Lato',sans-serif] text-xs text-gray-500">
          Pre-seeded with Blinkit brand benchmark • pgvector RAG active • Instant console access
        </p>
      </div>
    </section>
  );
}
