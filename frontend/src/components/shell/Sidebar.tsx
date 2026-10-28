"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { UserRole } from "@/lib/types";
import {
  LayoutDashboard,
  FileCheck2,
  BookOpen,
  Globe,
  UploadCloud,
  FileText,
  Search,
  Plus,
  Sun,
  Moon,
  ChevronDown,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  ExternalLink,
} from "@/components/ui/icons";

export function Sidebar() {
  const pathname = usePathname() ?? "";
  const {
    brands,
    activeBrand,
    activeBrandId,
    setActiveBrandId,
    currentRole,
    setCurrentRole,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    theme,
    toggleTheme,
    isSidebarCollapsed,
    toggleSidebar,
  } = useApp();

  const isDark = theme === "dark";

  // Dropdown states
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const brandRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (brandRef.current && !brandRef.current.contains(event.target as Node)) {
        setIsBrandDropdownOpen(false);
      }
      if (roleRef.current && !roleRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut: Cmd+K / Ctrl+K to focus search or toggle sidebar
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        if (isSidebarCollapsed) {
          toggleSidebar();
          setTimeout(() => searchInputRef.current?.focus(), 150);
        } else {
          searchInputRef.current?.focus();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarCollapsed, toggleSidebar]);

  const roles: UserRole[] = ["CREATOR", "JUDGE", "ADMIN", "REVIEWER", "MANAGER"];
  const isBrand = currentRole === "REVIEWER" || currentRole === "MANAGER";
  const isCreator = currentRole === "CREATOR";
  const isAdminOrJudge = currentRole === "ADMIN" || currentRole === "JUDGE";

  const navItems = isCreator
    ? [
        {
          label: "Creator Dashboard",
          path: "/dashboard",
          icon: LayoutDashboard,
          badge: "Submissions",
        },
        {
          label: "Upload Content",
          path: "/content",
          icon: UploadCloud,
          badge: "Upload",
        },
      ]
    : isBrand
    ? [
        {
          label: "Brand Dashboard",
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
          label: "Brand Guidelines",
          path: "/guidelines",
          icon: BookOpen,
          badge: null,
        },
        {
          label: "Audit Queue & Approvals",
          path: "/audit",
          icon: FileText,
          badge: null,
        },
      ]
    : [
        {
          label: "Dashboard",
          path: "/dashboard",
          icon: LayoutDashboard,
          badge: null,
        },
        {
          label: "Judge Canvas",
          path: "/judge",
          icon: FileCheck2,
          badge: "Evaluate",
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
          label: "Audit Queue",
          path: "/audit",
          icon: FileText,
          badge: null,
        },
        {
          label: "Brand Guidelines",
          path: "/guidelines",
          icon: BookOpen,
          badge: null,
        },
      ];

  const filteredNavItems = searchQuery.trim()
    ? navItems.filter((item) =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : navItems;

  const roleColors: Record<UserRole, { dot: string; bg: string; text: string }> = {
    CREATOR: {
      dot: "bg-emerald-500",
      bg: isDark ? "bg-emerald-950/40 border-emerald-800/40" : "bg-emerald-50 border-emerald-200",
      text: isDark ? "text-emerald-400" : "text-emerald-700",
    },
    JUDGE: {
      dot: "bg-amber-500",
      bg: isDark ? "bg-amber-950/40 border-amber-800/40" : "bg-amber-50 border-amber-200",
      text: isDark ? "text-amber-400" : "text-amber-700",
    },
    ADMIN: {
      dot: "bg-purple-500",
      bg: isDark ? "bg-purple-950/40 border-purple-800/40" : "bg-purple-50 border-purple-200",
      text: isDark ? "text-purple-400" : "text-purple-700",
    },
    REVIEWER: {
      dot: "bg-blue-500",
      bg: isDark ? "bg-blue-950/40 border-blue-800/40" : "bg-blue-50 border-blue-200",
      text: isDark ? "text-blue-400" : "text-blue-700",
    },
    MANAGER: {
      dot: "bg-indigo-500",
      bg: isDark ? "bg-indigo-950/40 border-indigo-800/40" : "bg-indigo-50 border-indigo-200",
      text: isDark ? "text-indigo-400" : "text-indigo-700",
    },
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen border-r shadow-xs z-50 flex flex-col justify-between select-none transition-all duration-300 font-sans ${
          isMobileMenuOpen
            ? "translate-x-0 w-72"
            : isSidebarCollapsed
            ? "-translate-x-full lg:translate-x-0 lg:w-20"
            : "-translate-x-full lg:translate-x-0 lg:w-68"
        } ${
          isDark
            ? "bg-[#18191d] border-[#2e2f38] text-[#e3e2e6]"
            : "bg-white border-[#e2e8f0] text-[#111827]"
        }`}
      >
        {/* Top Scrollable Container for Navigation & Upper Bar Components */}
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          {/* 1. Header: Brand Logo & Title & Collapse/Close */}
          <div
            className={`h-16 flex items-center shrink-0 border-b transition-colors px-3 ${
              isSidebarCollapsed
                ? "justify-center"
                : "justify-between"
            } ${
              isDark ? "bg-[#18191d] border-[#2e2f38]" : "bg-white border-[#e2e8f0]"
            }`}
          >
            {isSidebarCollapsed ? (
              <button
                type="button"
                onClick={toggleSidebar}
                className={`w-10 h-10 rounded-xl flex items-center justify-center group cursor-pointer transition-colors ${
                  isDark ? "hover:bg-[#25262c]" : "hover:bg-[#f1f5f9]"
                }`}
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-xs group-hover:hidden ${
                    isDark ? "bg-[#7c3aed]" : "bg-[#005797]"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div
                  className={`hidden group-hover:flex items-center justify-center ${
                    isDark ? "text-[#d2bbff]" : "text-[#005797]"
                  }`}
                >
                  <PanelLeftOpen size={19} />
                </div>
              </button>
            ) : (
              <>
                <Link
                  href="/"
                  className="flex items-center gap-2.5 min-w-0 group"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-xs shrink-0 transition-transform group-hover:scale-105 ${
                      isDark ? "bg-[#7c3aed]" : "bg-[#005797]"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span
                      className={`font-serif text-lg tracking-tight font-bold truncate leading-none ${
                        isDark ? "text-white" : "text-[#111827]"
                      }`}
                    >
                      Inkloom
                    </span>
                    <span
                      className={`text-[10px] font-mono tracking-wider font-semibold uppercase leading-tight ${
                        isDark ? "text-[#9ca3af]" : "text-[#64748b]"
                      }`}
                    >
                      Governance
                    </span>
                  </div>
                </Link>

                {/* Desktop Collapse & Mobile Close buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleSidebar}
                    className={`hidden lg:flex w-7 h-7 rounded-lg border items-center justify-center cursor-pointer transition-colors shadow-2xs ${
                      isDark
                        ? "bg-[#212228] border-[#383a45] text-[#9ca3af] hover:text-white hover:bg-[#2b2c34]"
                        : "bg-[#f8fafc] border-[#cbd5e1] text-[#64748b] hover:text-[#111827] hover:bg-[#edf2f7]"
                    }`}
                    title="Collapse sidebar"
                    aria-label="Collapse sidebar"
                  >
                    <PanelLeftClose size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`lg:hidden w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer transition-colors ${
                      isDark
                        ? "bg-[#212228] border-[#383a45] text-[#9ca3af] hover:text-white hover:bg-[#2b2c34]"
                        : "bg-[#f8fafc] border-[#cbd5e1] text-[#64748b] hover:text-[#111827] hover:bg-[#edf2f7]"
                    }`}
                    title="Close sidebar"
                    aria-label="Close sidebar"
                  >
                    <X size={16} />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 2. Brand Selector (Upper component moved to sidebar) */}
          <div className={`p-3 pb-2 relative shrink-0 ${isSidebarCollapsed ? "flex justify-center" : ""}`} ref={brandRef}>
            {isSidebarCollapsed ? (
              <button
                type="button"
                onClick={() => {
                  if (isCreator) return;
                  setIsBrandDropdownOpen(!isBrandDropdownOpen);
                }}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition-all shadow-2xs ${
                  isDark
                    ? "bg-[#212228] border-[#383a45] hover:border-[#7c3aed]/60 hover:bg-[#2b2c34]"
                    : "bg-[#f8fafc] border-[#cbd5e1] hover:border-[#005797]/50 hover:bg-[#edf2f7]"
                }`}
                title={`Active Brand: ${activeBrand ? activeBrand.name : "Blinkit"}`}
              >
                <div className="w-5 h-5 rounded-md bg-[#F8C200] flex items-center justify-center shrink-0 border border-[#e5b300]/80 shadow-2xs">
                  <span className="font-black text-[12px] text-[#1C1C1E] font-sans -mt-0.5 leading-none">b</span>
                  <span className="w-1 h-1 rounded-full bg-[#00A36C] -ml-0.5 -mt-1.5" />
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
                className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                  isDark
                    ? "bg-[#212228] border-[#383a45] hover:border-[#7c3aed]/50 hover:bg-[#272830]"
                    : "bg-[#f8fafc] border-[#cbd5e1] hover:border-[#005797]/40 hover:bg-[#f1f5f9]"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-[#F8C200] flex items-center justify-center shrink-0 border border-[#e5b300]/80 shadow-2xs">
                    <span className="font-black text-[13px] text-[#1C1C1E] font-sans -mt-0.5 leading-none">b</span>
                    <span className="w-1 h-1 rounded-full bg-[#00A36C] -ml-0.5 -mt-1.5" />
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span
                      className={`text-xs font-bold truncate leading-none mb-0.5 ${
                        isDark ? "text-white" : "text-[#111827]"
                      }`}
                    >
                      {activeBrand ? activeBrand.name : "Blinkit"}
                    </span>
                    <span
                      className={`text-[10px] font-mono leading-none ${
                        isDark ? "text-[#9ca3af]" : "text-[#64748b]"
                      }`}
                    >
                      {isCreator ? "Demo Partner (Locked)" : "Active Brand"}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  size={15}
                  className={`transition-transform duration-200 shrink-0 ${
                    isBrandDropdownOpen ? "rotate-180" : ""
                  } ${isDark ? "text-[#9ca3af]" : "text-[#64748b]"}`}
                />
              </button>
            )}

            {/* Brand Dropdown Menu */}
            {isBrandDropdownOpen && (
              <div
                className={`absolute ${
                  isSidebarCollapsed ? "left-16 top-3 w-60" : "left-3 right-3 top-14"
                } rounded-xl border shadow-xl py-1.5 z-60 max-h-72 overflow-y-auto ${
                  isDark
                    ? "bg-[#1f2026] border-[#383a45] text-white"
                    : "bg-white border-[#cbd5e1] text-[#111827]"
                }`}
              >
                <div
                  className={`px-3 py-1.5 border-b flex items-center justify-between ${
                    isDark ? "border-[#2e2f38] bg-[#18191d]" : "border-[#e2e8f0] bg-[#f8fafc]"
                  }`}
                >
                  <span
                    className={`text-[10px] font-mono uppercase tracking-wider font-bold ${
                      isDark ? "text-[#9ca3af]" : "text-[#64748b]"
                    }`}
                  >
                    Governed Brands ({brands.length})
                  </span>
                  <Link
                    href="/guidelines"
                    onClick={() => {
                      setIsBrandDropdownOpen(false);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`text-[11px] font-bold flex items-center gap-1 hover:underline ${
                      isDark ? "text-[#d2bbff]" : "text-[#005797]"
                    }`}
                  >
                    <span>Manage</span>
                    <ExternalLink size={11} />
                  </Link>
                </div>

                <div className="py-1">
                  {brands.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setActiveBrandId(b.id);
                        setIsBrandDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        b.id === activeBrandId
                          ? isDark
                            ? "bg-[#7c3aed]/20 text-[#d2bbff] font-bold"
                            : "bg-[#ebf6ff] text-[#005797] font-bold"
                          : isDark
                          ? "text-[#d1d5db] hover:bg-[#25262c]"
                          : "text-[#374151] hover:bg-[#f8fafc]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate pr-2">
                        <div className="w-5 h-5 rounded bg-[#F8C200] flex items-center justify-center shrink-0">
                          <span className="font-black text-[11px] text-[#1C1C1E] font-sans -mt-0.5">b</span>
                        </div>
                        <span className="truncate font-sans font-medium">{b.name}</span>
                      </div>
                      {b.id === activeBrandId && (
                        <Check
                          size={15}
                          className={isDark ? "text-[#d2bbff]" : "text-[#005797]"}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. New Audit CTA Button (Upper component moved to sidebar) */}
          <div className={`px-3 py-1.5 shrink-0 ${isSidebarCollapsed ? "flex justify-center" : ""}`}>
            {isSidebarCollapsed ? (
              <Link
                href={isCreator ? "/content" : "/audit"}
                title={isCreator ? "Upload Content" : "New Audit"}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs transition-all hover:scale-105 cursor-pointer ${
                  isDark
                    ? "bg-[#7c3aed] hover:bg-[#6d28d9] shadow-[#7c3aed]/25"
                    : "bg-[#005797] hover:bg-[#004578] shadow-[#005797]/25"
                }`}
              >
                <Plus size={18} />
              </Link>
            ) : (
              <Link
                href={isCreator ? "/content" : "/audit"}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`w-full flex items-center justify-center gap-2 h-9 px-3 rounded-xl font-sans text-xs font-semibold text-white shadow-xs transition-all duration-150 hover:shadow-md cursor-pointer ${
                  isDark
                    ? "bg-[#7c3aed] hover:bg-[#6d28d9] shadow-[#7c3aed]/20"
                    : "bg-[#005797] hover:bg-[#004578] shadow-[#005797]/20"
                }`}
              >
                <Plus size={16} />
                <span>{isCreator ? "Upload Content" : "New Audit"}</span>
              </Link>
            )}
          </div>

          {/* 4. Global Search Bar (Upper component moved to sidebar) */}
          <div className={`px-3 py-1.5 shrink-0 ${isSidebarCollapsed ? "flex justify-center" : ""}`}>
            {isSidebarCollapsed ? (
              <button
                type="button"
                onClick={toggleSidebar}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition-colors shadow-2xs ${
                  isDark
                    ? "bg-[#212228] border-[#383a45] text-[#9ca3af] hover:text-white hover:bg-[#2b2c34]"
                    : "bg-[#f8fafc] border-[#cbd5e1] text-[#64748b] hover:text-[#111827] hover:bg-[#edf2f7]"
                }`}
                title="Search rules, audits... (⌘K)"
                aria-label="Search"
              >
                <Search size={16} />
              </button>
            ) : (
              <div className="relative flex items-center">
                <Search
                  size={15}
                  className={`absolute left-2.5 pointer-events-none ${
                    isDark ? "text-[#9ca3af]" : "text-[#64748b]"
                  }`}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search rules, audits..."
                  className={`w-full h-8.5 pl-8 pr-12 rounded-xl font-sans text-xs border transition-all focus:outline-none ${
                    isDark
                      ? "bg-[#151619] border-[#2e2f38] text-white placeholder:text-[#6b7280] focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]/30"
                      : "bg-[#f8fafc] border-[#cbd5e1] text-[#111827] placeholder:text-[#94a3b8] focus:border-[#005797] focus:bg-white focus:ring-1 focus:ring-[#005797]/30"
                  }`}
                />
                <kbd
                  className={`absolute right-2 text-[10px] font-mono px-1.5 py-0.5 rounded border pointer-events-none ${
                    isDark
                      ? "bg-[#212228] border-[#383a45] text-[#9ca3af]"
                      : "bg-white border-[#cbd5e1] text-[#64748b]"
                  }`}
                >
                  ⌘K
                </kbd>
              </div>
            )}
          </div>

          {/* Section Heading */}
          {!isSidebarCollapsed && (
            <div className="px-4 pt-4 pb-1.5">
              <span
                className={`font-mono text-[10px] uppercase tracking-wider font-bold ${
                  isDark ? "text-[#9ca3af]" : "text-[#64748b]"
                }`}
              >
                Platform
              </span>
            </div>
          )}

          {/* 5. Navigation Items */}
          <nav
            className={`flex flex-col gap-1 py-1 ${
              isSidebarCollapsed ? "px-2 items-center" : "px-3"
            }`}
          >
            {filteredNavItems.map((item) => {
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
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
                      isActive
                        ? isDark
                          ? "bg-[#7c3aed]/20 text-[#d2bbff] shadow-2xs font-bold"
                          : "bg-[#ebf6ff] text-[#005797] shadow-2xs font-bold"
                        : isDark
                        ? "text-[#9ca3af] hover:bg-[#25262c] hover:text-white"
                        : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#111827]"
                    }`}
                  >
                    <Icon size={19} />
                    {isActive && (
                      <span
                        className={`absolute left-0 w-1 h-5 rounded-r-full ${
                          isDark ? "bg-[#7c3aed]" : "bg-[#005797]"
                        }`}
                      />
                    )}
                  </Link>
                );
              }

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all duration-150 cursor-pointer ${
                    isActive
                      ? isDark
                        ? "bg-[#7c3aed]/20 text-[#d2bbff] font-bold border-l-3 border-[#7c3aed] shadow-2xs"
                        : "bg-[#ebf6ff] text-[#005797] font-bold border-l-3 border-[#005797] shadow-2xs"
                      : isDark
                      ? "text-[#d1d5db] hover:bg-[#25262c] hover:text-white font-medium"
                      : "text-[#374151] hover:bg-[#f8fafc] hover:text-[#005797] font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      size={17}
                      className={`shrink-0 ${
                        isActive
                          ? isDark
                            ? "text-[#d2bbff]"
                            : "text-[#005797]"
                          : isDark
                          ? "text-[#9ca3af]"
                          : "text-[#64748b]"
                      }`}
                    />
                    <span className="font-sans leading-tight truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold shrink-0 ${
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

        {/* Bottom Section: Theme Toggle, User Role Switcher & User Identity */}
        <div
          className={`border-t transition-colors shrink-0 flex flex-col gap-2 p-3 ${
            isDark ? "border-[#2e2f38] bg-[#141518]" : "border-[#e2e8f0] bg-[#f8fafc]"
          }`}
        >
          {/* 6. Theme Toggle (Upper component moved to sidebar) */}
          {isSidebarCollapsed ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={toggleTheme}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition-colors shadow-2xs ${
                  isDark
                    ? "bg-[#212228] border-[#383a45] text-amber-400 hover:bg-[#2b2c34]"
                    : "bg-white border-[#cbd5e1] text-[#64748b] hover:text-[#111827] hover:bg-[#edf2f7]"
                }`}
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                aria-label="Toggle theme mode"
              >
                {isDark ? <Sun size={17} /> : <Moon size={17} />}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={toggleTheme}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl border transition-colors cursor-pointer text-xs shadow-2xs ${
                isDark
                  ? "bg-[#212228] border-[#383a45] text-[#d1d5db] hover:bg-[#272830]"
                  : "bg-white border-[#cbd5e1] text-[#374151] hover:bg-[#f1f5f9]"
              }`}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle theme mode"
            >
              <div className="flex items-center gap-2">
                <span className={isDark ? "text-amber-400" : "text-[#64748b]"}>
                  {isDark ? <Sun size={15} /> : <Moon size={15} />}
                </span>
                <span className="font-medium">{isDark ? "Dark Theme" : "Light Theme"}</span>
              </div>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  isDark ? "bg-[#18191d] text-[#9ca3af]" : "bg-[#f1f5f9] text-[#64748b]"
                }`}
              >
                {isDark ? "Dark" : "Light"}
              </span>
            </button>
          )}

          {/* 7. User Role Switcher (Upper component moved to sidebar) */}
          <div className="relative" ref={roleRef}>
            {isSidebarCollapsed ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition-colors shadow-2xs relative ${
                    isDark
                      ? "bg-[#212228] border-[#383a45] hover:bg-[#2b2c34]"
                      : "bg-white border-[#cbd5e1] hover:bg-[#edf2f7]"
                  }`}
                  title={`Active Role: ${currentRole.toLowerCase()}`}
                  aria-label="Change user role"
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${roleColors[currentRole].dot}`}
                  />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl border transition-colors cursor-pointer text-xs shadow-2xs ${
                  isDark
                    ? "bg-[#212228] border-[#383a45] text-white hover:bg-[#272830]"
                    : "bg-white border-[#cbd5e1] text-[#111827] hover:bg-[#f1f5f9]"
                }`}
                title="Switch active governance role"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${roleColors[currentRole].dot}`}
                  />
                  <span className="font-semibold capitalize">
                    {currentRole.toLowerCase()} Role
                  </span>
                </div>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${
                    isRoleDropdownOpen ? "rotate-180" : ""
                  } ${isDark ? "text-[#9ca3af]" : "text-[#64748b]"}`}
                />
              </button>
            )}

            {/* Role Dropdown */}
            {isRoleDropdownOpen && (
              <div
                className={`absolute ${
                  isSidebarCollapsed ? "left-16 bottom-0 w-44" : "left-0 right-0 bottom-9"
                } rounded-xl border shadow-xl p-1 z-60 ${
                  isDark
                    ? "bg-[#1f2026] border-[#383a45] text-white"
                    : "bg-white border-[#cbd5e1] text-[#111827]"
                }`}
              >
                <div
                  className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider font-bold border-b mb-1 ${
                    isDark ? "text-[#9ca3af] border-[#2e2f38]" : "text-[#64748b] border-[#e2e8f0]"
                  }`}
                >
                  Switch Role
                </div>
                {roles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setCurrentRole(r);
                      setIsRoleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      currentRole === r
                        ? isDark
                          ? "bg-[#7c3aed]/20 text-[#d2bbff] font-bold"
                          : "bg-[#ebf6ff] text-[#005797] font-bold"
                        : isDark
                        ? "text-[#d1d5db] hover:bg-[#25262c]"
                        : "text-[#374151] hover:bg-[#f8fafc]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${roleColors[r].dot}`}
                      />
                      <span className="capitalize font-medium">{r.toLowerCase()}</span>
                    </div>
                    {currentRole === r && (
                      <Check
                        size={14}
                        className={isDark ? "text-[#d2bbff]" : "text-[#005797]"}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 8. User Profile Card */}
          {isSidebarCollapsed ? (
            <div
              className="flex justify-center cursor-pointer"
              title={`Alex Rivera · ${currentRole.toLowerCase()}`}
            >
              <div className="relative">
                <div
                  className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-xs shadow-2xs ${
                    isDark
                      ? "bg-[#7c3aed]/20 border-[#7c3aed]/40 text-[#d2bbff]"
                      : "bg-[#ebf6ff] border-[#005797]/30 text-[#005797]"
                  }`}
                >
                  AR
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 ${
                    roleColors[currentRole].dot
                  } ${isDark ? "border-[#141518]" : "border-[#f8fafc]"}`}
                />
              </div>
            </div>
          ) : (
            <div
              className={`flex items-center justify-between p-2 rounded-xl border shadow-2xs ${
                isDark ? "bg-[#1f2026] border-[#383a45]" : "bg-white border-[#cbd5e1]"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shadow-2xs ${
                      isDark
                        ? "bg-[#7c3aed]/20 border-[#7c3aed]/40 text-[#d2bbff]"
                        : "bg-[#ebf6ff] border-[#005797]/30 text-[#005797]"
                    }`}
                  >
                    AR
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                      roleColors[currentRole].dot
                    } ${isDark ? "border-[#1f2026]" : "border-white"}`}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span
                    className={`text-xs font-bold truncate leading-none mb-1 ${
                      isDark ? "text-white" : "text-[#111827]"
                    }`}
                  >
                    Alex Rivera
                  </span>
                  <span
                    className={`text-[10px] font-mono leading-none truncate ${
                      isDark ? "text-[#9ca3af]" : "text-[#64748b]"
                    }`}
                  >
                    Governance Lead
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
