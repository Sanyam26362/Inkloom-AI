"use client";

import React from "react";
import { BlinkitCampaignPreview } from "./BlinkitCampaignPreview";

interface BlinkitClientCardProps {
  isSelected: boolean;
  onSelect: () => void;
}

export function BlinkitClientCard({ isSelected, onSelect }: BlinkitClientCardProps) {
  return (
    <div
      onClick={onSelect}
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`relative rounded-[22px] p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between bg-white dark:bg-[#15161E] ${
        isSelected
          ? "border-2 border-[#635BFF] shadow-[0_10px_30px_rgba(99,91,255,0.10)] ring-1 ring-[#635BFF]/30"
          : "border border-slate-200 dark:border-[#2b2c36] hover:border-slate-300 dark:hover:border-slate-600 shadow-xs"
      }`}
    >
      <div>
        {/* Top Header: Logo, Name, Badge, Radio */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Blinkit 'b' logo */}
            <div className="w-10 h-10 rounded-xl bg-[#F8C200] flex items-center justify-center font-black text-black text-xl shadow-xs select-none shrink-0">
              b
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  className="font-bold text-base text-slate-900 dark:text-white leading-tight"
                  style={{
                    fontFamily:
                      'var(--font-geist-sans), "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  }}
                >
                  Blinkit
                </h3>
                <span className="text-[10px] font-semibold text-[#00A36C] bg-[#E8FAF0] dark:bg-emerald-950/40 border border-[#A7F3D0] dark:border-emerald-800/40 px-2 py-0.5 rounded-full leading-none">
                  Recommended Demo
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium leading-none mt-1">
                Quick Commerce Retail
              </p>
            </div>
          </div>

          {/* Radio Indicator */}
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all shrink-0 ${
              isSelected
                ? "border-2 border-[#635BFF]"
                : "border-2 border-slate-300 dark:border-slate-600"
            }`}
          >
            {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-[#635BFF]" />}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-4 mb-5">
          Pre-packaged with authentic Diwali 2026 campaign briefs, visual palette rules (#F8C200, #00A36C), banned terminology, and multi-modal compliance tests.
        </p>

        {/* Two-column features & preview */}
        <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr] items-center gap-4 mb-5">
          {/* Left features list */}
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <li className="flex items-center gap-2.5">
              <span className="w-4 h-4 text-[#635BFF] shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </span>
              <span>Real campaign examples</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-4 h-4 text-[#635BFF] shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                  <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                  <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                  <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                </svg>
              </span>
              <span>Brand colors & typography</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-4 h-4 text-[#635BFF] shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>
              <span>Pre-built governance rules</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-4 h-4 text-[#635BFF] shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </span>
              <span>Multimodal assets (images, text, video)</span>
            </li>
          </ul>

          {/* Right Campaign Preview */}
          <div className="flex justify-center sm:justify-end">
            <BlinkitCampaignPreview />
          </div>
        </div>
      </div>

      {/* Bottom Swatches & Pack Label */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
        <span
          className="w-4 h-4 rounded-full inline-block shadow-2xs border border-black/10"
          style={{ backgroundColor: "#F8C200" }}
          title="#F8C200"
        />
        <span
          className="w-4 h-4 rounded-full inline-block shadow-2xs border border-black/10"
          style={{ backgroundColor: "#00A36C" }}
          title="#00A36C"
        />
        <span
          className="w-4 h-4 rounded-full inline-block shadow-2xs border border-black/10"
          style={{ backgroundColor: "#17191C" }}
          title="#17191C"
        />
        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium ml-2">
          Diwali 2026 Pack
        </span>
      </div>
    </div>
  );
}
