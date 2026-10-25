"use client";

import React from "react";

export function AIGovernanceIllustration() {
  return (
    <aside
      aria-hidden="true"
      className="hidden xl:flex flex-col items-center justify-start select-none pointer-events-none relative w-[240px] shrink-0 pt-2"
    >
      {/* Hand-drawn Script Annotation & Arrow */}
      <div className="relative w-full h-[90px] mb-1">
        <svg
          viewBox="0 0 190 85"
          className="w-full h-full overflow-visible"
          fill="none"
        >
          {/* Script Text */}
          <text
            x="24"
            y="26"
            fill="#635BFF"
            fontSize="15"
            fontWeight="700"
            fontStyle="italic"
            fontFamily="'Caveat', 'Segoe Script', 'Comic Sans MS', cursive, sans-serif"
            transform="rotate(3 24 26)"
          >
            AI-powered
          </text>
          <text
            x="38"
            y="44"
            fill="#635BFF"
            fontSize="15"
            fontWeight="700"
            fontStyle="italic"
            fontFamily="'Caveat', 'Segoe Script', 'Comic Sans MS', cursive, sans-serif"
            transform="rotate(3 38 44)"
          >
            brand governance
          </text>

          {/* Curved Arrow pointing down-left towards the checklist */}
          <path
            d="M 100 48 C 122 58 118 74 104 82"
            stroke="#635BFF"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 112 76 L 104 82 L 107 72"
            stroke="#635BFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>

        {/* Purple Sparkles ✦ */}
        <span className="absolute top-2 right-1 text-[#635BFF] text-base opacity-80">
          ✦
        </span>
      </div>

      {/* Floating AI Governance SVG Card */}
      <div className="relative w-full max-w-[225px] transform rotate-[5deg] transition-transform duration-300 hover:rotate-[3deg]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/illustrations/ai-governance-checklist.svg"
          alt="AI brand governance checklist illustration"
          className="w-full h-auto object-contain drop-shadow-[0_12px_24px_rgba(99,91,255,0.12)]"
        />

        {/* Subtle purple sparkle */}
        <span className="absolute -bottom-2 -left-2 text-[#635BFF] text-base opacity-80">
          ✦
        </span>
      </div>
    </aside>
  );
}
