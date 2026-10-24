"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Sidebar } from "@/components/shell/Sidebar";
import { Menu } from "@/components/ui/icons";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, isSidebarCollapsed, isMobileMenuOpen, setIsMobileMenuOpen } = useApp();
  const isLandingPage = pathname === "/";
  const isSetupPage = pathname?.startsWith("/setup");
  const isDark = theme === "dark";

  if (isLandingPage || isSetupPage) {
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
      className={`flex min-h-screen w-full font-sans transition-colors duration-200 ${
        isDark ? "bg-[#121316] text-[#e3e2e6]" : "bg-[#f8fafc] text-[#111827]"
      }`}
    >
      {/* Mobile Floating Menu Button when sidebar is closed */}
      {!isMobileMenuOpen && (
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className={`fixed top-3 left-3 z-30 lg:hidden flex items-center justify-center w-10 h-10 rounded-xl border shadow-md transition-all cursor-pointer ${
            isDark
              ? "bg-[#18191d] border-[#2e2f38] text-white hover:bg-[#25262c]"
              : "bg-white border-[#cbd5e1] text-[#111827] hover:bg-[#f8fafc]"
          }`}
          aria-label="Open navigation sidebar"
          title="Open navigation menu"
        >
          <Menu size={19} />
        </button>
      )}

      {/* Main Unified Sidebar containing all navigation & upper bar components */}
      <Sidebar />

      {/* Main Content Area without top bar */}
      <div
        className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${
          isSidebarCollapsed ? "pl-0 lg:pl-20" : "pl-0 lg:pl-68"
        } ${isDark ? "bg-[#121316]" : "bg-[#f8fafc]"}`}
      >
        <main
          className={`relative flex-1 w-full pt-14 lg:pt-0 transition-colors duration-200 ${
            isDark ? "bg-[#121316]" : "bg-[#f8fafc]"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
