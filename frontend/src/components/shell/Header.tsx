"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { UserRole } from "@/lib/types";

export function Header() {
  const pathname = usePathname();
  const {
    brands,
    activeBrand,
    activeBrandId,
    setActiveBrandId,
    currentRole,
    setCurrentRole,
    health,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    theme,
    toggleTheme,
  } = useApp();

  const isDark = theme === "dark";

  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // Derive breadcrumb from pathname
  const getBreadcrumbTitle = () => {
    if (pathname === "/" || pathname === "/dashboard") return "Platform Console";
    if (pathname.startsWith("/audit")) return "Content Audit Workspace";
    if (pathname.startsWith("/guidelines")) return "Brand Guidelines Management";
    if (pathname.startsWith("/api-console")) return "API Testing Console";
    return "Governance";
  };

  const roles: UserRole[] = ["CREATOR", "REVIEWER", "MANAGER"];

  return (
    <header
      className={`fixed top-0 left-0 lg:left-72 right-0 h-16 backdrop-blur-md border-b shadow-2xs z-40 flex items-center justify-between px-4 lg:px-8 font-sans transition-colors ${
        isDark ? "bg-[#1b1b1f]/95 border-[#292a2d] text-[#e3e2e6]" : "bg-white/95 border-[#e5e7eb] text-[#111827]"
      }`}
    >
      {/* Left side: Hamburger, Breadcrumb & Brand Dropdown */}
      <div className="flex items-center gap-3 lg:gap-6">
        {/* Mobile Hamburger */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`p-1.5 rounded-md border lg:hidden transition-colors ${
            isDark
              ? "bg-[#1f1f23] border-[#292a2d] text-white hover:bg-[#292a2d]"
              : "bg-white border-[#e5e7eb] text-[#111827] hover:bg-[#f4f4f4]"
          }`}
          title="Toggle Navigation Menu"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        {/* Breadcrumb */}
        <div className="hidden sm:flex items-center gap-2 font-sans text-[13px]">
          <span className={isDark ? "text-[#9ca3af] font-medium" : "text-[#4b5563] font-medium"}>
            Inkloom Governance
          </span>
          <span className={`material-symbols-outlined text-[14px] ${isDark ? "text-[#6b7280]" : "text-[#9ca3af]"}`}>
            chevron_right
          </span>
          <span className={`font-bold ${isDark ? "text-white" : "text-[#111827]"}`}>
            {getBreadcrumbTitle()}
          </span>
        </div>

        {/* Active Brand Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md border shadow-2xs transition-colors cursor-pointer text-left ${
              isDark
                ? "bg-[#1f1f23] border-[#292a2d] text-white hover:bg-[#292a2d]"
                : "bg-white border-[#e5e7eb] text-[#111827] hover:bg-[#f8fafc]"
            }`}
          >
            <span
              className={`material-symbols-outlined text-[18px] ${
                isDark ? "text-[#d2bbff]" : "text-primary"
              }`}
            >
              verified_user
            </span>
            <div className="flex flex-col">
              <span className={`font-sans text-[13px] font-bold leading-tight ${isDark ? "text-white" : "text-[#111827]"}`}>
                {activeBrand ? activeBrand.name : "Blinkit"}
              </span>
              <span className={`text-[10px] font-mono leading-none ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
                ID #{activeBrandId} · {activeBrand?.industry || "Enterprise"}
              </span>
            </div>
            <span className={`material-symbols-outlined text-[16px] ml-1 ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
              arrow_drop_down
            </span>
          </button>

          {isBrandDropdownOpen && (
            <div
              className={`absolute left-0 mt-1 w-72 rounded-xl border shadow-xl py-1 z-50 max-h-80 overflow-y-auto ${
                isDark ? "bg-[#1b1b1f] border-[#292a2d] text-white" : "bg-white border-[#e5e7eb] text-[#111827]"
              }`}
              onMouseLeave={() => setIsBrandDropdownOpen(false)}
            >
              <div
                className={`px-3 py-2 border-b flex items-center justify-between ${
                  isDark ? "border-[#292a2d] bg-[#121316]" : "border-[#e5e7eb] bg-[#f8fafc]"
                }`}
              >
                <span
                  className={`text-[11px] font-sans uppercase tracking-wider font-bold ${
                    isDark ? "text-[#9ca3af]" : "text-[#6b7280]"
                  }`}
                >
                  Select Governed Brand ({brands.length})
                </span>
                <Link
                  href="/guidelines"
                  onClick={() => setIsBrandDropdownOpen(false)}
                  className={`text-[11px] hover:underline font-bold ${
                    isDark ? "text-[#d2bbff]" : "text-primary"
                  }`}
                >
                  Manage Brands
                </Link>
              </div>

              {brands.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setActiveBrandId(b.id);
                    setIsBrandDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-[13px] flex items-center justify-between transition-colors ${
                    b.id === activeBrandId
                      ? isDark
                        ? "bg-[#7c3aed]/20 text-[#d2bbff] font-bold"
                        : "bg-[#ebf6ff] text-primary font-bold"
                      : isDark
                      ? "text-[#d1d5db] hover:bg-[#292a2d]"
                      : "text-[#374151] hover:bg-[#f8fafc]"
                  }`}
                >
                  <div className="flex flex-col truncate pr-2">
                    <span className="truncate font-sans font-medium">{b.name}</span>
                    <span className={`text-[11px] font-mono ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
                      {b.industry}
                    </span>
                  </div>
                  {b.id === activeBrandId && (
                    <span
                      className={`material-symbols-outlined text-[16px] ${
                        isDark ? "text-[#d2bbff]" : "text-primary"
                      }`}
                    >
                      check
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Search, Theme Toggle, Role Switcher, New Audit CTA */}
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative hidden md:flex items-center">
          <span className={`material-symbols-outlined absolute left-3 text-[18px] ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
            search
          </span>
          <input
            type="text"
            placeholder="Search guidelines, rules, past audits... ⌘K"
            className={`w-72 h-9 pl-9 pr-4 rounded-full font-sans text-[13px] border focus:outline-none transition-all ${
              isDark
                ? "bg-[#121316] border-[#292a2d] text-white placeholder:text-[#9ca3af] focus:border-[#7c3aed]"
                : "bg-[#f8fafc] border-[#e5e7eb] text-[#111827] placeholder:text-[#6b7280] focus:ring-1 focus:ring-primary focus:bg-white"
            }`}
          />
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className={`p-2 rounded-full border shadow-2xs transition-all cursor-pointer flex items-center justify-center ${
            isDark
              ? "bg-[#1f1f23] border-[#292a2d] text-amber-400 hover:bg-[#292a2d]"
              : "bg-white border-[#e5e7eb] text-[#6b7280] hover:bg-[#f8fafc] hover:text-[#111827]"
          }`}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle theme mode"
        >
          <span className="material-symbols-outlined text-[18px]">
            {isDark ? "dark_mode" : "light_mode"}
          </span>
        </button>

        {/* Development Role Simulator Toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-2xs transition-colors cursor-pointer ${
              isDark
                ? "bg-[#1f1f23] border-[#292a2d] hover:bg-[#292a2d] text-white"
                : "bg-white border-[#e5e7eb] hover:bg-[#f8fafc] text-[#111827]"
            }`}
            title="Development RBAC Role Switcher"
          >
            <span className={`text-[10px] font-sans uppercase tracking-wider font-bold ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
              Role:
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                isDark ? "bg-[#7c3aed]/20 text-[#d2bbff]" : "bg-[#ebf6ff] text-primary"
              }`}
            >
              {currentRole}
            </span>
            <span className={`material-symbols-outlined text-[16px] ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
              tune
            </span>
          </button>

          {isRoleDropdownOpen && (
            <div
              className={`absolute right-0 mt-1 w-64 rounded-xl border shadow-xl p-2 z-50 ${
                isDark ? "bg-[#1b1b1f] border-[#292a2d] text-white" : "bg-white border-[#e5e7eb] text-[#111827]"
              }`}
              onMouseLeave={() => setIsRoleDropdownOpen(false)}
            >
              <div
                className={`px-2 py-1 mb-1 border-b rounded-t-lg ${
                  isDark ? "border-[#292a2d] bg-[#121316]" : "border-[#e5e7eb] bg-[#f8fafc]"
                }`}
              >
                <span className={`text-[11px] font-sans uppercase tracking-wider font-bold ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
                  Simulate RBAC Identity (Dev)
                </span>
                <p className={`text-[11px] mt-0.5 ${isDark ? "text-[#9ca3af]" : "text-[#4b5563]"}`}>
                  Appends <code className={`font-mono text-[10px] ${isDark ? "text-[#d2bbff]" : "text-primary"}`}>x-user-role</code> to API calls.
                </p>
              </div>

              {roles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setCurrentRole(r);
                    setIsRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-[12px] flex items-center justify-between transition-colors ${
                    currentRole === r
                      ? isDark
                        ? "bg-[#7c3aed]/20 text-[#d2bbff] font-bold"
                        : "bg-[#ebf6ff] text-primary font-bold"
                      : isDark
                      ? "text-[#d1d5db] hover:bg-[#292a2d]"
                      : "text-[#374151] hover:bg-[#f8fafc]"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-mono font-bold">{r}</span>
                    <span className={`text-[10px] ${isDark ? "text-[#9ca3af]" : "text-[#6b7280]"}`}>
                      {r === "CREATOR"
                        ? "Drafting & pre-flight checks"
                        : r === "REVIEWER"
                        ? "Finding review & overrides"
                        : "Brand settings & rule configuration"}
                    </span>
                  </div>
                  {currentRole === r && (
                    <span className={`material-symbols-outlined text-[14px] ${isDark ? "text-[#d2bbff]" : "text-primary"}`}>
                      check
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Button: New Audit */}
        <Link
          href="/audit"
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-sans text-[13px] font-bold shadow-xs transition-all cursor-pointer ${
            isDark ? "bg-[#7c3aed] hover:bg-[#6d28d9] text-white" : "bg-primary hover:bg-[#004578] text-white"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span className="hidden sm:inline">New Audit</span>
        </Link>
      </div>
    </header>
  );
}
