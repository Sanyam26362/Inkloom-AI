"use client";

import React, { useState } from "react";

export function Section2_CookieBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-6 md:right-6 lg:max-w-[1246px] lg:mx-auto z-50 bg-white border border-gray-200 shadow-2xl rounded-lg p-5 transition-all duration-300">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex-1">
          <p className="font-['Lato',sans-serif] text-[16px] font-bold text-[#212121] mb-1">
            We value your privacy
          </p>
          <p className="font-['Lato',sans-serif] text-[13px] text-[#4b5563] leading-relaxed">
            We use cookies to deliver and improve our services. If you&apos;re not happy with our{" "}
            <a href="#" className="underline text-[#1863dc] hover:text-[#005797]">
              Privacy Notice
            </a>{" "}
            or{" "}
            <a href="#" className="underline text-[#1863dc] hover:text-[#005797]">
              Cookie Policy
            </a>
            , click &quot;Do not share my personal information&quot; to opt-out.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => setIsVisible(false)}
            className="text-[13px] font-medium text-[#1863dc] hover:underline whitespace-nowrap cursor-pointer"
          >
            Do not share my personal information
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="px-5 py-2 bg-[#005797] hover:bg-[#004578] text-white text-xs font-bold rounded-full transition-colors cursor-pointer"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
