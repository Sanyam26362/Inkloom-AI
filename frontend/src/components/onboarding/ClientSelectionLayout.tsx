"use client";

import React from "react";
import { BrandGuidelinesIllustration } from "./BrandGuidelinesIllustration";
import { BlinkitClientCard } from "./BlinkitClientCard";
import { NewBrandCard } from "./NewBrandCard";
import { AIGovernanceIllustration } from "./AIGovernanceIllustration";

interface ClientSelectionLayoutProps {
  clientType: "blinkit" | "custom";
  setClientType: (type: "blinkit" | "custom") => void;
  customBrandName: string;
  setCustomBrandName: (name: string) => void;
  customTone: string;
  setCustomTone: (tone: string) => void;
  guidelineFile: File | null;
  setGuidelineFile: (file: File) => void;
  onContinue: () => void;
  loading: boolean;
}

export function ClientSelectionLayout({
  clientType,
  setClientType,
  customBrandName,
  setCustomBrandName,
  customTone,
  setCustomTone,
  guidelineFile,
  setGuidelineFile,
  onContinue,
  loading,
}: ClientSelectionLayoutProps) {
  return (
    <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6">
      {/* Cards and Decorative Illustrations Row */}
      <div className="flex items-start justify-center gap-4 lg:gap-6 xl:gap-8">
        {/* Left Decorative Illustration */}
        <BrandGuidelinesIllustration />

        {/* Two Main Cards Side by Side */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          <BlinkitClientCard
            isSelected={clientType === "blinkit"}
            onSelect={() => setClientType("blinkit")}
          />

          <NewBrandCard
            isSelected={clientType === "custom"}
            onSelect={() => setClientType("custom")}
            brandName={customBrandName}
            onBrandNameChange={setCustomBrandName}
            brandTone={customTone}
            onBrandToneChange={setCustomTone}
            selectedFile={guidelineFile}
            onFileSelect={setGuidelineFile}
          />
        </div>

        {/* Right Decorative Illustration */}
        <AIGovernanceIllustration />
      </div>

      {/* Bottom Actions Row */}
      <div className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 mt-7 pb-10">
        {/* Left: Learn More Button */}
        <button
          type="button"
          onClick={() => {
            window.open(
              "https://github.com",
              "_blank",
              "noopener,noreferrer"
            );
          }}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1b22] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {/* Book Icon */}
          <svg
            className="w-4 h-4 text-slate-500 dark:text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <span>Learn more about our demo clients</span>
        </button>

        {/* Right: Continue CTA */}
        <button
          type="button"
          disabled={loading}
          onClick={onContinue}
          className="w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-xs sm:text-sm bg-[#635BFF] hover:bg-[#5249e0] text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? "Configuring..." : "Continue to Ingestion →"}
        </button>
      </div>
    </div>
  );
}
