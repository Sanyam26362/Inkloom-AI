"use client";

import React from "react";

export function BrandGuidelinesIllustration() {
  return (
    <aside
      aria-hidden="true"
      className="hidden xl:flex flex-col items-center justify-start select-none pointer-events-none relative w-[240px] shrink-0 pt-2"
    >
      {/* Hand-drawn Script Annotation & Arrow */}
      <div className="relative w-full h-[90px] mb-1">
        <svg
          viewBox="0 0 180 85"
          className="w-full h-full overflow-visible"
          fill="none"
        >
          {/* 3 Radiating dashes above 'Trusted' */}
          <path
            d="M 38 12 L 32 3"
            stroke="#635BFF"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M 47 10 L 47 1"
            stroke="#635BFF"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M 56 12 L 62 3"
            stroke="#635BFF"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Script Text */}
          <text
            x="36"
            y="28"
            fill="#635BFF"
            fontSize="15"
            fontWeight="700"
            fontStyle="italic"
            fontFamily="'Caveat', 'Segoe Script', 'Comic Sans MS', cursive, sans-serif"
            transform="rotate(-4 36 28)"
          >
            Trusted brand
          </text>
          <text
            x="58"
            y="45"
            fill="#635BFF"
            fontSize="15"
            fontWeight="700"
            fontStyle="italic"
            fontFamily="'Caveat', 'Segoe Script', 'Comic Sans MS', cursive, sans-serif"
            transform="rotate(-4 58 45)"
          >
            guidelines
          </text>

          {/* Curved Arrow pointing down-right towards the card */}
          <path
            d="M 68 52 C 58 64 56 74 68 80"
            stroke="#635BFF"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 61 74 L 68 80 L 69 71"
            stroke="#635BFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>

        {/* Purple Sparkle ✦ */}
        <span className="absolute -top-1 left-2 text-[#635BFF] text-base opacity-80">
          ✦
        </span>
      </div>

      {/* Floating Brand Guidelines SVG Card */}
      <div className="relative w-full max-w-[230px] transition-transform duration-300 hover:rotate-[-6deg]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/illustrations/brand-guidelines.svg"
          alt="Brand Guidelines illustration"
          className="w-full h-auto object-contain drop-shadow-[0_12px_24px_rgba(99,91,255,0.12)]"
        />

        {/* Subtle purple sparkle near bottom */}
        <span className="absolute -bottom-2 right-4 text-[#A855F7] text-lg opacity-75">
          ✦
        </span>
      </div>
    </aside>
  );
}
