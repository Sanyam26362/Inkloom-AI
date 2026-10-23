"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";

export function Sidebar() {
  const pathname = usePathname();
  const {
    currentRole,
    health,
    activeBrand,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    theme,
    toggleTheme,
  } = useApp();

  const isDark = theme === "dark";

  const navItems = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: "dashboard",
      badge: null,
    },
    {
      label: "Content Audit",
      path: "/audit",
      icon: "spellcheck",
      badge: "Primary",
    },
    {
      label: "Brand Guidelines",
      path: "/guidelines",
      icon: "menu_book",
      badge: null,
    },
    {
      label: "Landing Page",
      path: "/",
      icon: "language",
      badge: "Live",
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen w-72 border-r shadow-xs z-50 flex flex-col justify-between select-none transition-all duration-200 font-sans ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isDark ? "bg-[#1b1b1f] border-[#292a2d] text-[#e3e2e6]" : "bg-white border-[#e5e7eb] text-[#111827]"}`}
      >
        {/* Top Header & Navigation */}
        <div className="flex flex-col">
          {/* Brand Header */}
          <div
            className={`h-16 px-6 flex items-center gap-3 border-b transition-colors ${
              isDark ? "bg-[#1b1b1f] border-[#292a2d]" : "bg-white border-[#e5e7eb]"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-sm flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0 ${
                isDark ? "bg-[#7c3aed]" : "bg-primary"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span
                className={`font-serif text-[17px] tracking-tight font-bold flex items-center gap-1.5 leading-none ${
                  isDark ? "text-white" : "text-[#111827]"
                }`}
              >
                Inkloom AI
                <span className="w-1.5 h-1.5 rounded-full bg-[#00A36C] animate-pulse" title="Engine Active" />
              </span>
              <span
                className={`font-sans text-[10px] uppercase tracking-wider font-semibold mt-1 ${
                  isDark ? "text-[#9ca3af]" : "text-[#4b5563]"
                }`}
              >
                Brand Governance
              </span>
            </div>
          </div>

          {/* Category Header */}
          <div className="px-6 pt-5 pb-2">
            <span
              className={`font-sans text-[11px] uppercase tracking-wider font-bold ${
                isDark ? "text-[#9ca3af]" : "text-[#6b7280]"
              }`}
            >
              Governance Core
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 px-3">
            {navItems.map((item) => {
              const isActive =
                item.path === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-md transition-all duration-150 ${
                    isActive
                      ? isDark
                        ? "bg-[#7c3aed]/20 text-[#d2bbff] font-bold border-l-4 border-[#7c3aed] shadow-2xs"
                        : "bg-[#ebf6ff] text-[#005797] font-bold border-l-4 border-[#005797] shadow-2xs"
                      : isDark
                      ? "text-[#d1d5db] hover:bg-[#292a2d] hover:text-white font-medium"
                      : "text-[#374151] hover:bg-[#f4f4f4] hover:text-[#005797] font-medium"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        isActive
                          ? isDark
                            ? "text-[#d2bbff]"
                            : "text-[#005797]"
                          : isDark
                          ? "text-[#9ca3af]"
                          : "text-[#6b7280]"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="font-sans text-[14px] leading-tight">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-sans uppercase tracking-wider font-bold ${
                        isActive
                          ? isDark
                            ? "bg-[#7c3aed] text-white"
                            : "bg-[#005797] text-white"
                          : isDark
                          ? "bg-[#7c3aed]/20 text-[#d2bbff] border border-[#7c3aed]/40"
                          : "bg-[#ebf6ff] text-[#005797] border border-[#005797]/30"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Information Widgets */}
        <div
          className={`flex flex-col p-3 gap-2 border-t transition-colors ${
            isDark ? "bg-[#121316] border-[#292a2d]" : "bg-[#f8fafc] border-[#e5e7eb]"
          }`}
        >
          {/* Theme Switcher Toggle Card (Whole card is clickable) */}
          <div
            onClick={toggleTheme}
            className={`px-3 py-2.5 rounded-md border shadow-2xs flex items-center justify-between cursor-pointer transition-all ${
              isDark
                ? "bg-[#1f1f23] border-[#292a2d] hover:bg-[#292a2d]"
                : "bg-white border-[#e5e7eb] hover:bg-[#f4f4f4]"
            }`}
            title="Click to toggle between Dark and Light mode"
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center gap-2">
              <span
                className={`material-symbols-outlined text-[18px] transition-colors ${
                  isDark ? "text-amber-400" : "text-[#6b7280]"
                }`}
              >
                {isDark ? "dark_mode" : "light_mode"}
              </span>
              <span
                className={`font-sans text-[12px] font-bold ${
                  isDark ? "text-white" : "text-[#111827]"
                }`}
              >
                {isDark ? "Dark Theme" : "Light Theme"}
              </span>
            </div>
            <div
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors p-0.5 ${
                isDark ? "bg-[#7c3aed]" : "bg-[#cbd5e1]"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform duration-200 ${
                  isDark ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </div>
          </div>

          {/* Active Workspace / Brand Indicator */}
          <div
            className={`px-3 py-2 rounded-md border shadow-2xs flex items-center justify-between transition-colors ${
              isDark ? "bg-[#1f1f23] border-[#292a2d]" : "bg-white border-[#e5e7eb]"
            }`}
          >
            <div className="flex flex-col overflow-hidden">
              <span
                className={`font-sans text-[10px] uppercase tracking-wider font-semibold ${
                  isDark ? "text-[#9ca3af]" : "text-[#6b7280]"
                }`}
              >
                Active Brand
              </span>
              <span
                className={`font-sans text-[13px] font-bold truncate ${
                  isDark ? "text-white" : "text-[#111827]"
                }`}
              >
                {activeBrand ? activeBrand.name : "Blinkit"}
              </span>
            </div>
            <span
              className={`material-symbols-outlined text-[18px] ${
                isDark ? "text-[#d2bbff]" : "text-[#005797]"
              }`}
            >
              verified
            </span>
          </div>

          {/* Engine Status Card */}
          <div
            className={`px-3 py-2 rounded-md border shadow-2xs flex flex-col gap-1 transition-colors ${
              isDark ? "bg-[#1f1f23] border-[#292a2d]" : "bg-white border-[#e5e7eb]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00A36C] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00A36C]" />
                </span>
                <span className="font-sans text-[11px] text-[#00A36C] uppercase tracking-wider font-bold">
                  {health?.status === "healthy" ? "Engine Online" : "Connecting..."}
                </span>
              </div>
              <span className={`text-[10px] font-mono ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
                v1.0-dev
              </span>
            </div>
            <span
              className={`font-sans text-[11px] truncate font-mono ${
                isDark ? "text-[#9ca3af]" : "text-[#4b5563]"
              }`}
            >
              {health?.ai_integration?.primary_model
                ? `${health.ai_integration.primary_model} · pgvector`
                : "Gemini 3.5 · pgvector"}
            </span>
          </div>

          {/* User Identity / Role Badge */}
          <div className="pt-1 flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div
                className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${
                  isDark
                    ? "bg-[#7c3aed]/20 border-[#7c3aed]/40 text-[#d2bbff]"
                    : "bg-[#ebf6ff] border-[#005797]/30 text-primary"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span
                  className={`font-sans text-[13px] font-bold truncate ${
                    isDark ? "text-white" : "text-[#111827]"
                  }`}
                >
                  Alex Rivera
                </span>
                <span
                  className={`font-sans text-[10px] uppercase tracking-wider font-bold font-mono ${
                    isDark ? "text-[#d2bbff]" : "text-primary"
                  }`}
                >
                  {currentRole} Role
                </span>
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#00A36C]" title="Role Active" />
          </div>
        </div>
      </aside>
    </>
  );
}
