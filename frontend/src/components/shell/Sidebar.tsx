"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  LayoutDashboard,
  FileCheck2,
  BookOpen,
  Globe,
  UploadCloud,
  PanelLeftClose,
  PanelLeftOpen,
} from "@/components/ui/icons";

export function Sidebar() {
  const pathname = usePathname() ?? "";
  const {
    currentRole,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    theme,
    isSidebarCollapsed,
    toggleSidebar,
  } = useApp();

  const isDark = theme === "dark";

  const navItems = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      label: "Brand Setup",
      path: "/setup",
      icon: Globe,
      badge: "Start Here",
    },
    {
      label: "Creator Studio",
      path: "/content",
      icon: UploadCloud,
      badge: null,
    },
    {
      label: "Judge Canvas",
      path: "/judge",
      icon: FileCheck2,
      badge: "Evaluate",
    },
    {
      label: "Audit Queue",
      path: "/audit",
      icon: FileCheck2,
      badge: null,
    },
    {
      label: "Brand Guidelines",
      path: "/guidelines",
      icon: BookOpen,
      badge: null,
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
        className={`fixed left-0 top-0 h-screen border-r shadow-xs z-50 flex flex-col justify-between select-none transition-all duration-300 font-sans ${
          isMobileMenuOpen
            ? "translate-x-0 w-64"
            : isSidebarCollapsed
            ? "-translate-x-full lg:translate-x-0 lg:w-20"
            : "-translate-x-full lg:translate-x-0 lg:w-64"
        } ${isDark ? "bg-[#1b1b1f] border-[#3b3c44] text-[#e3e2e6]" : "bg-white border-[#cbd5e1] text-[#111827]"}`}
      >
        {/* Top Header & Navigation */}
        <div className="flex flex-col">
          {/* Brand Header */}
          <div
            className={`h-16 flex items-center border-b transition-colors ${
              isSidebarCollapsed
                ? "justify-center px-2"
                : "justify-between px-4"
            } ${isDark ? "bg-[#1b1b1f] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"}`}
          >
            {isSidebarCollapsed ? (
              <button
                type="button"
                onClick={toggleSidebar}
                className={`w-10 h-10 rounded-lg flex items-center justify-center group cursor-pointer transition-colors ${
                  isDark ? "hover:bg-[#292a2d]" : "hover:bg-[#f1f5f9]"
                }`}
                title="Expand sidebar"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-2xs group-hover:hidden ${
                  isDark ? "bg-[#7c3aed]" : "bg-[#005797]"
                }`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className={`hidden group-hover:flex items-center justify-center ${
                  isDark ? "text-[#d2bbff]" : "text-[#005797]"
                }`}>
                  <PanelLeftOpen size={18} />
                </div>
              </button>
            ) : (
              <>
                <Link href="/" className="flex items-center gap-2.5 min-w-0 group">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-2xs shrink-0 transition-transform group-hover:scale-105 ${
                    isDark ? "bg-[#7c3aed]" : "bg-[#005797]"
                  }`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <span className={`font-serif text-lg tracking-tight font-bold truncate leading-none ${
                    isDark ? "text-white" : "text-[#111827]"
                  }`}>
                    Inkloom
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={toggleSidebar}
                  className={`hidden lg:flex w-7 h-7 rounded-md border items-center justify-center cursor-pointer transition-colors shadow-2xs ${
                    isDark
                      ? "bg-[#1f1f23] border-[#3b3c44] text-[#9ca3af] hover:text-white hover:bg-[#292a2d]"
                      : "bg-white border-[#cbd5e1] text-[#64748b] hover:text-[#111827] hover:bg-[#f8fafc]"
                  }`}
                  title="Collapse sidebar"
                >
                  <PanelLeftClose size={15} />
                </button>
              </>
            )}
          </div>

          {/* Section Heading (Expanded only) */}
          {!isSidebarCollapsed && (
            <div className="px-4 pt-5 pb-2">
              <span
                className={`font-mono text-[10px] uppercase tracking-wider font-bold ${
                  isDark ? "text-[#9ca3af]" : "text-[#64748b]"
                }`}
              >
                Platform
              </span>
            </div>
          )}

          {/* Navigation Links */}
          <nav className={`flex flex-col gap-1.5 ${isSidebarCollapsed ? "px-2 pt-4 items-center" : "px-3"}`}>
            {navItems.map((item) => {
              const isActive =
                item.path === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.path);

              const Icon = item.icon;

              if (isSidebarCollapsed) {
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    title={item.label}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
                      isActive
                        ? isDark
                          ? "bg-[#7c3aed]/20 text-[#d2bbff] shadow-2xs font-bold"
                          : "bg-[#ebf6ff] text-[#005797] shadow-2xs font-bold"
                        : isDark
                        ? "text-[#9ca3af] hover:bg-[#292a2d] hover:text-white"
                        : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#111827]"
                    }`}
                  >
                    <Icon size={19} />
                    {isActive && (
                      <span className={`absolute left-0 w-1 h-5 rounded-r-full ${
                        isDark ? "bg-[#7c3aed]" : "bg-[#005797]"
                      }`} />
                    )}
                  </Link>
                );
              }

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all duration-150 cursor-pointer ${
                    isActive
                      ? isDark
                        ? "bg-[#7c3aed]/20 text-[#d2bbff] font-bold border-l-2 border-[#7c3aed] shadow-2xs"
                        : "bg-[#ebf6ff] text-[#005797] font-bold border-l-2 border-[#005797] shadow-2xs"
                      : isDark
                      ? "text-[#d1d5db] hover:bg-[#292a2d] hover:text-white font-medium"
                      : "text-[#374151] hover:bg-[#f8fafc] hover:text-[#005797] font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      size={17}
                      className={
                        isActive
                          ? isDark
                            ? "text-[#d2bbff]"
                            : "text-[#005797]"
                          : isDark
                          ? "text-[#9ca3af]"
                          : "text-[#64748b]"
                      }
                    />
                    <span className="font-sans leading-tight">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
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

        {/* Bottom User Identity Card */}
        <div
          className={`border-t transition-colors ${
            isSidebarCollapsed ? "p-3 flex justify-center" : "p-3"
          } ${isDark ? "border-[#3b3c44] bg-[#121316]" : "border-[#cbd5e1] bg-[#f8fafc]"}`}
        >
          {isSidebarCollapsed ? (
            <div
              className="relative cursor-pointer"
              title={`Alex Rivera · ${currentRole.toLowerCase()}`}
            >
              <div
                className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-xs shadow-2xs ${
                  isDark
                    ? "bg-[#7c3aed]/20 border-[#7c3aed]/40 text-[#d2bbff]"
                    : "bg-[#ebf6ff] border-[#005797]/30 text-[#005797]"
                }`}
              >
                AR
              </div>
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 ${
                currentRole === "MANAGER" ? "bg-purple-500" : currentRole === "REVIEWER" ? "bg-blue-500" : "bg-emerald-500"
              } ${isDark ? "border-[#121316]" : "border-[#f8fafc]"}`} />
            </div>
          ) : (
            <div className={`flex items-center justify-between p-2 rounded-lg border shadow-2xs ${
              isDark ? "bg-[#1f1f23] border-[#3b3c44]" : "bg-white border-[#cbd5e1]"
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                    isDark
                      ? "bg-[#7c3aed]/20 border-[#7c3aed]/40 text-[#d2bbff]"
                      : "bg-[#ebf6ff] border-[#005797]/30 text-[#005797]"
                  }`}
                >
                  AR
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={`text-xs font-bold truncate leading-none mb-1 ${
                    isDark ? "text-white" : "text-[#111827]"
                  }`}>
                    Alex Rivera
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      currentRole === "MANAGER" ? "bg-purple-500" : currentRole === "REVIEWER" ? "bg-blue-500" : "bg-emerald-500"
                    }`} />
                    <span className={`text-[10px] font-mono capitalize leading-none ${
                      isDark ? "text-[#9ca3af]" : "text-[#64748b]"
                    }`}>
                      {currentRole.toLowerCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
