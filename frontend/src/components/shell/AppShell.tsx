"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Sidebar } from "@/components/shell/Sidebar";
import { Menu } from "@/components/ui/icons";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, isSidebarCollapsed, isMobileMenuOpen, setIsMobileMenuOpen } = useApp();
  const isLandingPage = pathname === "/" || pathname === "/landing-v2";
  const isSetupPage = pathname?.startsWith("/setup");
  const isDark = theme === "dark";

  if (isSetupPage) {
    return (
      <div
        className={`brandlens-scope min-h-screen w-full overflow-x-hidden font-mono transition-colors duration-200 ${
          isDark ? "bg-[#121316] text-[#f5f0e7]" : "bg-[var(--paper)] text-[var(--ink)]"
        }`}
      >
        {children}
      </div>
    );
  }

  if (isLandingPage) {
    return (
      <div
        className="landing-scope min-h-screen w-full overflow-x-hidden selection:bg-accent selection:text-equally-action-color transition-colors duration-200 bg-background text-text-primary"
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={`brandlens-scope flex min-h-screen w-full font-mono transition-colors duration-200 overflow-x-hidden ${
        isDark ? "bg-[#121316] text-[#f5f0e7]" : "bg-[var(--paper)] text-[var(--ink)]"
      }`}
    >
      {/* Mobile Floating Menu Button when sidebar is closed */}
      {!isMobileMenuOpen && (
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="fixed top-3 left-3 z-30 lg:hidden flex items-center justify-center w-11 h-11 border-3 border-[var(--ink)] bg-[var(--yellow)] text-[var(--ink)] shadow-[4px_4px_0px_var(--ink)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer font-bold transition-transform"
          aria-label="Open navigation sidebar"
          title="Open navigation menu"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Main Unified Sidebar containing all navigation & upper bar components */}
      <Sidebar />

      {/* Main Content Area without top bar */}
      <div
        className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${
          isSidebarCollapsed ? "pl-0 lg:pl-20" : "pl-0 lg:pl-68"
        } ${isDark ? "bg-[#121316]" : "bg-[var(--paper)]"}`}
      >
        <main
          className={`relative flex-1 w-full pt-14 lg:pt-0 min-h-screen transition-colors duration-200 ${
            isDark ? "bg-[#121316] text-[#f5f0e7]" : "bg-[var(--paper)] text-[var(--ink)]"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
