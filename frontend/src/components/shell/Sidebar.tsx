"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";

export function Sidebar() {
  const pathname = usePathname();
  const { currentRole, health, activeBrand, isMobileMenuOpen, setIsMobileMenuOpen } = useApp();

  const navItems = [
    {
      label: "Dashboard",
      path: "/",
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
      label: "API Testing",
      path: "/api-console",
      icon: "terminal",
      badge: "Live",
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen w-72 bg-surface-container-low border-r border-outline-variant/30 shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between select-none transition-transform duration-200 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
      {/* Top Header & Navigation */}
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-16 px-gutter flex items-center gap-space-sm bg-surface-container-lowest/60 border-b border-outline-variant/20">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-container via-purple-600 to-tertiary flex items-center justify-center shadow-[0_0_12px_rgba(124,58,237,0.4)] shrink-0">
            <span className="material-symbols-outlined text-white text-[22px]">auto_stories</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-[16px] text-on-surface tracking-tight font-semibold flex items-center gap-1.5">
              Inkloom AI
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" title="Engine Active" />
            </span>
            <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider">
              Brand Governance
            </span>
          </div>
        </div>

        {/* Category Header */}
        <div className="px-gutter pt-space-md pb-space-xs">
          <span className="font-label-sm text-[11px] text-outline uppercase tracking-wider font-medium">
            Governance Core
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1 px-space-sm">
          {navItems.map((item) => {
            const isActive =
              item.path === "/"
                ? pathname === "/"
                : pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center justify-between px-space-md py-space-sm rounded-lg transition-all duration-150 ${
                  isActive
                    ? "bg-primary-container text-on-primary-container font-semibold shadow-[0_0_12px_rgba(124,58,237,0.35)]"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                }`}
              >
                <div className="flex items-center gap-space-md">
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      isActive ? "text-on-primary-container" : "text-outline"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="font-body-md text-[14px]">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-label-sm uppercase tracking-wider font-semibold ${
                      isActive
                        ? "bg-on-primary-container/20 text-on-primary-container"
                        : "bg-primary-container/20 text-primary border border-primary/20"
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
      <div className="flex flex-col p-space-sm gap-space-xs bg-surface-container-lowest/80 border-t border-outline-variant/20">
        {/* Active Workspace / Brand Indicator */}
        <div className="px-space-sm py-space-xs rounded-lg bg-surface-container flex items-center justify-between">
          <div className="flex flex-col overflow-hidden">
            <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Active Brand</span>
            <span className="font-body-sm text-[13px] text-on-surface font-medium truncate">
              {activeBrand ? activeBrand.name : "Blinkit"}
            </span>
          </div>
          <span className="material-symbols-outlined text-outline text-[18px]">verified</span>
        </div>

        {/* Engine Status Card */}
        <div className="px-space-sm py-space-xs rounded-lg bg-surface-container-low border border-outline-variant/30 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary" />
              </span>
              <span className="font-label-sm text-[11px] text-tertiary uppercase tracking-wider font-semibold">
                {health?.status === "healthy" ? "Engine Online" : "Connecting..."}
              </span>
            </div>
            <span className="text-[10px] font-mono text-outline">v1.0-dev</span>
          </div>
          <span className="font-code-sm text-[11px] text-on-surface-variant truncate font-mono">
            {health?.ai_integration?.primary_model
              ? `${health.ai_integration.primary_model} · pgvector`
              : "Gemini 3.5 · pgvector"}
          </span>
        </div>

        {/* User Identity / Role Badge */}
        <div className="pt-space-xs flex items-center justify-between px-space-sm">
          <div className="flex items-center gap-space-sm overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-[18px]">person</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-body-sm text-[13px] text-on-surface font-medium truncate">Alex Rivera</span>
              <span className="font-label-sm text-[10px] text-primary uppercase tracking-wider font-mono">
                {currentRole} Role
              </span>
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-tertiary" title="Role Active" />
        </div>
      </div>
    </aside>
    </>
  );
}
