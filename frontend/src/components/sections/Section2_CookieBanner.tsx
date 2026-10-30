"use client";

import React, { useState } from "react";

export function Section2_CookieBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-6 md:right-6 lg:max-w-[1246px] lg:mx-auto z-50 px-6 py-[16.5px] font-sans text-base leading-[1.4] text-text-primary bg-background border-[0.67px] border-palette-7 shadow-lg rounded-sm transition-all duration-300">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex-1">
          <p className="mb-1 font-sans text-base font-bold leading-[1.33] text-palette-9">
            BrandLens Data Privacy &amp; PII Confidentiality Notice
          </p>
          <p className="font-sans text-2xs leading-[1.71] text-palette-9">
            BrandLens processes all brand collateral using local reverse-offset PII scrubbers before invoking external model APIs. We use cookies and session storage strictly for platform operations and telemetry. Review our{" "}
            <a href="#" className="underline text-palette-15 hover:text-primary">
              Security Architecture
            </a>{" "}
            and{" "}
            <a href="#" className="underline text-palette-15 hover:text-primary">
              Confidentiality Charter
            </a>.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => setIsVisible(false)}
            className="block py-1.5 font-sans text-2xs font-medium leading-[1.71] text-left underline whitespace-nowrap text-palette-15 rounded-[2px] cursor-pointer"
          >
            Review privacy parameters
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="px-6 py-2.5 bg-primary hover:bg-[#004578] text-background text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Acknowledge &amp; Continue
          </button>
        </div>
      </div>
    </div>
  );
}
