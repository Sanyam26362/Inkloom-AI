"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Sidebar } from "@/components/shell/Sidebar";
import { Menu } from "@/components/ui/icons";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, isSidebarCollapsed, isMobileMenuOpen, setIsMobileMenuOpen } = useApp();
  const isLandingPage = pathname === "/";
  const isSetupPage = pathname?.startsWith("/setup");
  const isDark = theme === "dark";

  const [isSSOCallback, setIsSSOCallback] = useState(false);

  useEffect(() => {
    const checkSSO = () => {
      if (typeof window !== "undefined" && window.location.hash.includes("sso-callback")) {
        setIsSSOCallback(true);
      } else {
        setIsSSOCallback(false);
      }
    };
    checkSSO();
    window.addEventListener("hashchange", checkSSO);
    return () => window.removeEventListener("hashchange", checkSSO);
  }, []);

  if (isSSOCallback) {
    const role =
      typeof window !== "undefined"
        ? (localStorage.getItem("inkloom_signup_role") || localStorage.getItem("inkloom_role") || "").toUpperCase()
        : "";
    const ssoDestination =
      role === "REVIEWER" || role === "MANAGER" || role === "BRAND"
        ? "/setup?step=1"
        : role === "CREATOR"
        ? "/content"
        : "/dashboard";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#101010] text-[#f5f0e7] font-mono">
        <div className="w-full max-w-md p-6 border-4 border-black bg-[#1c1d22] shadow-[8px_8px_0px_#000] text-center">
          <div className="w-14 h-14 border-3 border-black bg-[var(--yellow)] text-black flex items-center justify-center mx-auto mb-4 shadow-[3px_3px_0px_#000] animate-spin">
            <span className="material-symbols-outlined text-[32px]">sync</span>
          </div>
          <h2 className="font-archivo font-black text-lg uppercase tracking-tight mb-2">
            Completing Single Sign-On
          </h2>
          <p className="text-xs font-mono text-[#888] leading-relaxed mb-6">
            Finalizing authentication handshake and redirecting to your workspace...
          </p>

          <div className="flex justify-center">
            <AuthenticateWithRedirectCallback
              signInFallbackRedirectUrl={ssoDestination}
              signUpFallbackRedirectUrl={ssoDestination}
              signInForceRedirectUrl={ssoDestination}
              signUpForceRedirectUrl={ssoDestination}
            />
          </div>

          <div className="w-full bg-white/10 h-2 border border-black overflow-hidden mt-6">
            <div className="bg-[var(--green)] h-full w-2/3 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

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
