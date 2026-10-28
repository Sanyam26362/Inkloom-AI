"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, Moon, Sun } from "@/components/ui/icons";

interface OnboardingHeaderProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
  userEmail?: string;
}

export function OnboardingHeader({
  theme,
  toggleTheme,
  userEmail = "demo@inkloom.ai",
}: OnboardingHeaderProps) {
  const isDark = theme === "dark";
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="w-full h-16 bg-white dark:bg-[#13141a] border-b border-slate-100 dark:border-[#2b2c34] flex items-center justify-between px-6 sm:px-8 sticky top-0 z-40 transition-colors">
      {/* Brand Logo & Subtitle */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#635BFF] flex items-center justify-center shadow-xs select-none shrink-0">
          <span className="font-black text-white text-sm tracking-tight">IK</span>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight leading-none">
            Inkloom AI
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium leading-none mt-1">
            Enterprise Brand Governance
          </span>
        </div>
      </div>

      {/* Actions: Brand Dashboard Link, Theme Toggle, Help, Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <Link
          href="/dashboard"
          className="text-xs font-bold text-[#635BFF] dark:text-[#a594fd] hover:underline px-3 py-1.5 rounded-xl border border-[#635BFF]/30 bg-[#635BFF]/5 hover:bg-[#635BFF]/10 transition-colors flex items-center gap-1 shadow-2xs"
          title="Jump to Brand Governance Dashboard"
        >
          <span>Brand Dashboard</span>
          <span>→</span>
        </Link>
        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle dark / light theme"
          title={`Switch to ${isDark ? "light" : "dark"} mode`}
          className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-amber-400 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Help Icon */}
        <button
          type="button"
          aria-label="Help and documentation"
          title="Help & documentation"
          onClick={() => {
            window.open("https://github.com", "_blank");
          }}
          className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
        >
          <span className="text-xs font-bold leading-none">?</span>
        </button>

        {/* User Profile Avatar with Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown((prev) => !prev)}
            aria-label="User profile menu"
            className="flex items-center gap-1.5 pl-1 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-[#635BFF] flex items-center justify-center text-white font-bold text-xs shadow-xs select-none">
              P
            </div>
            <ChevronDown size={14} className="text-slate-400 dark:text-slate-500" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-[#1c1d24] border border-slate-200 dark:border-slate-700 shadow-xl py-2 z-50 text-xs">
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                <p className="font-semibold text-slate-800 dark:text-slate-200">Enterprise Admin</p>
                <p className="text-slate-400 dark:text-slate-500 truncate">{userEmail}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDropdown(false)}
                className="w-full text-left px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Account Settings
              </button>
              <button
                type="button"
                onClick={() => setShowDropdown(false)}
                className="w-full text-left px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Governance Policies
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
