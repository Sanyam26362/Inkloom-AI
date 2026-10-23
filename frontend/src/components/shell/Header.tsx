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
  } = useApp();

  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // Derive breadcrumb from pathname
  const getBreadcrumbTitle = () => {
    if (pathname === "/") return "Platform Console";
    if (pathname.startsWith("/audit")) return "Content Audit Workspace";
    if (pathname.startsWith("/guidelines")) return "Brand Guidelines Management";
    if (pathname.startsWith("/api-console")) return "API Testing Console";
    return "Governance";
  };

  const roles: UserRole[] = ["CREATOR", "REVIEWER", "MANAGER"];

  return (
    <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/30 shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-space-md lg:px-gutter-desktop">
      {/* Left side: Hamburger, Breadcrumb & Brand Dropdown */}
      <div className="flex items-center gap-space-sm lg:gap-space-lg">
        {/* Mobile Hamburger */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 rounded-lg bg-surface-container text-on-surface lg:hidden hover:bg-surface-container-high transition-colors"
          title="Toggle Navigation Menu"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        {/* Breadcrumb */}
        <div className="hidden sm:flex items-center gap-2 text-outline font-body-sm text-[13px]">
          <span className="text-on-surface-variant font-medium">Inkloom Governance</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface font-semibold">{getBreadcrumbTitle()}</span>
        </div>

        {/* Active Brand Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
            className="flex items-center gap-space-sm px-space-md py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface transition-colors cursor-pointer text-left"
          >
            <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
            <div className="flex flex-col">
              <span className="font-body-sm text-[13px] font-medium leading-tight">
                {activeBrand ? activeBrand.name : "Blinkit"}
              </span>
              <span className="text-[10px] text-outline font-mono leading-none">
                ID #{activeBrandId} · {activeBrand?.industry || "Enterprise"}
              </span>
            </div>
            <span className="material-symbols-outlined text-outline text-[16px] ml-1">
              arrow_drop_down
            </span>
          </button>

          {isBrandDropdownOpen && (
            <div
              className="absolute left-0 mt-1 w-72 rounded-xl bg-surface-container-high border border-outline-variant/40 shadow-2xl py-1 z-50 max-h-80 overflow-y-auto"
              onMouseLeave={() => setIsBrandDropdownOpen(false)}
            >
              <div className="px-3 py-2 border-b border-outline-variant/20 flex items-center justify-between">
                <span className="text-[11px] font-label-sm uppercase tracking-wider text-outline">
                  Select Governed Brand ({brands.length})
                </span>
                <Link
                  href="/guidelines"
                  onClick={() => setIsBrandDropdownOpen(false)}
                  className="text-[11px] text-primary hover:underline font-medium"
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
                  className={`w-full text-left px-3 py-2 text-[13px] flex items-center justify-between hover:bg-surface-container-highest transition-colors ${
                    b.id === activeBrandId ? "bg-primary-container/20 text-primary font-semibold" : "text-on-surface"
                  }`}
                >
                  <div className="flex flex-col truncate pr-2">
                    <span className="truncate">{b.name}</span>
                    <span className="text-[11px] text-outline font-mono">{b.industry}</span>
                  </div>
                  {b.id === activeBrandId && (
                    <span className="material-symbols-outlined text-primary text-[16px]">check</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Search, Role Simulation Switcher, Org Health, New Audit CTA */}
      <div className="flex items-center gap-space-md">
        {/* Search Input */}
        <div className="relative hidden md:flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">search</span>
          <input
            type="text"
            placeholder="Search guidelines, rules, past audits... ⌘K"
            className="w-72 h-9 pl-9 pr-4 rounded-lg bg-surface-container text-on-surface placeholder:text-outline font-body-sm text-[13px] border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary-container transition-all"
          />
        </div>

        {/* Development Role Simulator Toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            className="flex items-center gap-1.5 px-space-sm py-1 rounded-lg bg-surface-container border border-outline-variant/40 hover:bg-surface-container-high transition-colors"
            title="Development RBAC Role Switcher (Simulates x-user-role header)"
          >
            <span className="text-[10px] font-label-sm uppercase tracking-wider text-outline">Role:</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold ${
                currentRole === "CREATOR"
                  ? "bg-secondary-container/40 text-secondary-fixed"
                  : currentRole === "REVIEWER"
                  ? "bg-primary-container/40 text-primary-fixed"
                  : "bg-tertiary-container/40 text-tertiary-fixed"
              }`}
            >
              {currentRole}
            </span>
            <span className="material-symbols-outlined text-outline text-[16px]">tune</span>
          </button>

          {isRoleDropdownOpen && (
            <div
              className="absolute right-0 mt-1 w-64 rounded-xl bg-surface-container-high border border-outline-variant/40 shadow-2xl p-2 z-50"
              onMouseLeave={() => setIsRoleDropdownOpen(false)}
            >
              <div className="px-2 py-1 mb-1 border-b border-outline-variant/20">
                <span className="text-[11px] font-label-sm uppercase tracking-wider text-outline">
                  Simulate RBAC Identity (Dev)
                </span>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  Appends <code className="font-mono text-primary text-[10px]">x-user-role</code> to API calls.
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
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[12px] flex items-center justify-between hover:bg-surface-container-highest transition-colors ${
                    r === currentRole ? "bg-primary-container/20 text-primary font-semibold" : "text-on-surface"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-mono font-medium">{r}</span>
                    <span className="text-[10px] text-outline">
                      {r === "CREATOR" && "Drafts submissions, triggers audits"}
                      {r === "REVIEWER" && "Approves, overrides findings, reviews"}
                      {r === "MANAGER" && "Full administrative governance"}
                    </span>
                  </div>
                  {r === currentRole && (
                    <span className="material-symbols-outlined text-primary text-[16px]">check</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Engine Health Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-surface-container border border-outline-variant/20 text-tertiary font-label-md text-[12px] font-medium">
          <span className="material-symbols-outlined text-[16px]">shield_with_heart</span>
          <span>{health?.status === "healthy" ? "Engine 100%" : "Connecting"}</span>
        </div>

        {/* New Audit CTA */}
        <Link
          href="/audit"
          className="flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-primary-container hover:bg-primary-container/90 text-on-primary-container font-headline-sm text-[13px] font-semibold shadow-[0_0_14px_rgba(124,58,237,0.4)] transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>New Audit</span>
        </Link>
      </div>
    </header>
  );
}
