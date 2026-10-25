"use client";

import React from "react";

export function SelectClientHeading() {
  return (
    <div className="text-center max-w-2xl mx-auto pt-7 pb-6 px-4">
      {/* Pill Badge */}
      <div className="inline-flex items-center justify-center mb-3">
        <span className="text-[11px] font-bold tracking-wider uppercase text-[#635BFF] bg-[#F2EFFE] dark:bg-[#635BFF]/15 px-3.5 py-0.5 rounded-full border border-[#DDD6FE] dark:border-[#635BFF]/30 select-none">
          STEP 1 OF 4
        </span>
      </div>

      {/* Main Heading */}
      <h1
        className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight"
        style={{
          fontFamily:
            'var(--font-geist-sans), "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        Choose Your{" "}
        <span className="text-[#635BFF]">Enterprise Brand</span>
      </h1>

      {/* Subtitle */}
      <p className="mt-2.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl mx-auto">
        Get started by selecting a pre-configured client or creating your own brand workspace. Each brand comes with tailored guidelines, visual identity and AI governance settings.
      </p>
    </div>
  );
}
