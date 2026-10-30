"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
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
  User,
  Sliders,
  LogOut,
} from "@/components/ui/icons";

export function Sidebar() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { signOut } = useClerk();
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
    user,
    logout,
  } = useApp();

  const isDark = theme === "dark";

  // Dropdown states
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSetupDone, setIsSetupDone] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("inkloom_setup_completed") === "true";
      if (stored || (brands.length > 0 && brands.some((b) => b.id === activeBrandId))) {
        setIsSetupDone(true);
      }
    } catch {}
  }, [brands, activeBrandId]);

  const brandRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
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
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
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

  // Derive dynamic user details
  const rawUserName =
    user?.user_name?.trim() ||
    (user?.email ? user.email.split("@")[0] : "") ||
    (currentRole === "CREATOR"
      ? "Alex Rivera"
      : currentRole === "ADMIN"
      ? "Jordan Vance"
      : currentRole === "REVIEWER" || currentRole === "MANAGER"
      ? "Elena Rostova"
      : "Sasha Bloom");

  // Clean trailing parenthesized role like "(Creator)" or "(Admin)"
  const displayName = rawUserName.replace(/\s*\([^)]*\)$/, "").trim();
  const displayEmail = user?.email || `${(user?.role || currentRole).toLowerCase()}@inkloom.ai`;

  // Initials generator (e.g. "Alex Rivera" -> "AR", "Jordan Vance" -> "JV")
  const getInitials = (name: string): string => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(displayName);
  const displayRoleSubtitle = `${(currentRole || user?.role || "creator").toLowerCase()} · inkloom`;

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    try {
      await signOut();
    } catch (err) {
      console.warn("Clerk signOut error:", err);
    }
    logout();
    router.push("/");
  };

  const navItems = isCreator
    ? [
        {
          label: "Upload Content",
          path: "/content",
          icon: UploadCloud,
          badge: "Upload",
        },
        {
          label: "Creator Dashboard",
          path: "/dashboard",
          icon: LayoutDashboard,
          badge: "Queue",
        },
      ]
    : isBrand
    ? [
        ...(!isSetupDone
          ? [
              {
                label: "Brand Setup",
                path: "/setup",
                icon: Globe,
                badge: "Start",
              },
            ]
          : []),
        {
          label: "Brand Dashboard",
          path: "/dashboard",
          icon: LayoutDashboard,
          badge: null,
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
    : currentRole === "ADMIN"
    ? [
        {
          label: "Platform Command Center",
          path: "/dashboard",
          icon: LayoutDashboard,
          badge: "Admin",
        },
        {
          label: "Judge Canvas",
          path: "/judge",
          icon: FileCheck2,
          badge: "Demo",
        },
      ]
    : [
        {
          label: "Judge Canvas",
          path: "/judge",
          icon: FileCheck2,
          badge: "Evaluate",
        },
        {
          label: "Governance Dashboard",
          path: "/dashboard",
          icon: LayoutDashboard,
          badge: "Console",
        },
      ];

  const filteredNavItems = searchQuery.trim()
    ? navItems.filter((item) =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : navItems;

  const roleColors: Record<UserRole, { dot: string; bg: string; text: string }> = {
    CREATOR: {
      dot: "bg-emerald-400",
      bg: "bg-emerald-950/40 border-emerald-500",
      text: "text-emerald-400",
    },
    JUDGE: {
      dot: "bg-[var(--yellow)]",
      bg: "bg-amber-950/40 border-[var(--yellow)]",
      text: "text-[var(--yellow)]",
    },
    ADMIN: {
      dot: "bg-[var(--pink)]",
      bg: "bg-purple-950/40 border-[var(--pink)]",
      text: "text-[var(--pink)]",
    },
    REVIEWER: {
      dot: "bg-[var(--blue)]",
      bg: "bg-blue-950/40 border-[var(--blue)]",
      text: "text-[var(--blue)]",
    },
    MANAGER: {
      dot: "bg-indigo-400",
      bg: "bg-indigo-950/40 border-indigo-500",
      text: "text-indigo-400",
    },
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen z-50 flex flex-col justify-between select-none transition-all duration-300 font-mono bg-[var(--ink)] text-white border-r-4 ${
          isDark ? "border-[#2e2f38]" : "border-[var(--ink)]"
        } ${
          isMobileMenuOpen
            ? "translate-x-0 w-72 shadow-[8px_0_0_rgba(0,0,0,0.4)]"
            : isSidebarCollapsed
            ? "-translate-x-full lg:translate-x-0 lg:w-20"
            : "-translate-x-full lg:translate-x-0 lg:w-68"
        }`}
      >
        {/* Top Scrollable Container for Navigation & Upper Bar Components */}
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          {/* 1. Header: Brand Logo & Title & Collapse/Close */}
          <div
            className={`h-16 flex items-center shrink-0 border-b-3 border-[#262626] px-3 transition-colors ${
              isSidebarCollapsed ? "justify-center" : "justify-between"
            }`}
          >
            {isSidebarCollapsed ? (
              <button
                type="button"
                onClick={toggleSidebar}
                className="w-10 h-10 border-2 border-[#444] bg-[#18181b] hover:bg-[var(--yellow)] hover:text-[var(--ink)] hover:border-[var(--ink)] text-white shadow-[2px_2px_0px_#000] flex items-center justify-center cursor-pointer transition-all"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <div className="w-6 h-6 bg-[var(--yellow)] border border-[var(--ink)] flex items-center justify-center text-[var(--ink)] font-black text-xs">
                  B
                </div>
              </button>
            ) : (
              <>
                <Link
                  href="/"
                  className="flex items-center gap-2.5 min-w-0 group"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="w-8 h-8 bg-[var(--yellow)] border-2 border-[var(--ink)] shadow-[2px_2px_0px_#fff] flex items-center justify-center text-[var(--ink)] font-black text-sm shrink-0 transition-transform group-hover:scale-105">
                    B
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-base tracking-tight font-black text-white leading-none font-display"
                      style={{ fontFamily: "var(--font-archivo), Arial, sans-serif" }}
                    >
                      BrandLens
                    </span>
                    <span className="text-[9px] font-mono tracking-widest font-bold uppercase text-[var(--yellow)] leading-tight mt-0.5">
                      GOVERNANCE AI
                    </span>
                  </div>
                </Link>

                {/* Desktop Collapse & Mobile Close buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleSidebar}
                    className="hidden lg:flex w-7 h-7 border-2 border-[#444] bg-[#18181b] hover:bg-[var(--yellow)] hover:text-[var(--ink)] hover:border-[var(--ink)] text-[#aaa] shadow-[2px_2px_0px_#000] items-center justify-center cursor-pointer transition-all"
                    title="Collapse sidebar"
                    aria-label="Collapse sidebar"
                  >
                    <PanelLeftClose size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="lg:hidden w-8 h-8 border-2 border-[#444] bg-[#18181b] hover:bg-[var(--red)] hover:text-white hover:border-[var(--ink)] text-[#aaa] shadow-[2px_2px_0px_#000] flex items-center justify-center cursor-pointer transition-all"
                    title="Close sidebar"
                    aria-label="Close sidebar"
                  >
                    <X size={16} />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 2. Workspace Label (Target Neo-Brutalism Blue Accent Block) */}
          {isSidebarCollapsed ? (
            <div
              className="px-2 pt-2.5 pb-1 flex justify-center shrink-0"
              title={`Workspace: ${activeBrand ? activeBrand.name : "Blinkit"}`}
            >
              <div className="w-10 h-7 bg-[var(--blue)] border-2 border-[var(--ink)] shadow-[2px_2px_0px_#000] flex items-center justify-center font-mono font-black text-[9px] text-[var(--ink)]">
                QA
              </div>
            </div>
          ) : (
            <div className="px-3 pt-2.5 pb-1 shrink-0">
              <div className="bg-[var(--blue)] text-[var(--ink)] border-2 border-[var(--ink)] shadow-[3px_3px_0px_#000] p-2 flex flex-col">
                <span className="text-[8.5px] font-mono font-bold tracking-wider uppercase text-[var(--ink)]/80 leading-none mb-1">
                  WORKSPACE // PRODUCT
                </span>
                <span className="text-xs font-mono font-black truncate text-[var(--ink)] leading-tight">
                  {activeBrand ? activeBrand.name : "Blinkit"} · Active QA
                </span>
              </div>
            </div>
          )}

          {/* 3. Brand Selector Dropdown */}
          <div className={`p-3 pb-2 relative shrink-0 ${isSidebarCollapsed ? "flex justify-center" : ""}`} ref={brandRef}>
            {isSidebarCollapsed ? (
              <button
                type="button"
                onClick={() => {
                  if (isCreator) return;
                  setIsBrandDropdownOpen(!isBrandDropdownOpen);
                }}
                className="w-10 h-10 border-2 border-[#333] hover:border-[var(--yellow)] bg-[#18181b] flex items-center justify-center shadow-[2px_2px_0px_#000] cursor-pointer transition-all"
                title={`Active Brand: ${activeBrand ? activeBrand.name : "Blinkit"}`}
              >
                <div className="w-5 h-5 bg-[#F8C200] border border-[var(--ink)] flex items-center justify-center shrink-0">
                  <span className="font-black text-[11px] text-[#1C1C1E] font-mono -mt-0.5 leading-none">b</span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
                className="w-full flex items-center justify-between p-2 border-2 border-[#333] hover:border-[var(--yellow)] bg-[#141416] text-white shadow-[2px_2px_0px_#000] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-5 h-5 bg-[#F8C200] border border-[var(--ink)] flex items-center justify-center shrink-0">
                    <span className="font-black text-[12px] text-[#1C1C1E] font-mono -mt-0.5 leading-none">b</span>
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-xs font-mono font-bold truncate text-white leading-none mb-0.5">
                      {activeBrand ? activeBrand.name : "Blinkit"}
                    </span>
                    <span className="text-[9.5px] font-mono text-[#888] leading-none">
                      {isCreator ? "Demo Partner (Locked)" : "Active Brand"}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 shrink-0 text-[#888] ${
                    isBrandDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}

            {/* Brand Dropdown Menu */}
            {isBrandDropdownOpen && (
              <div
                className={`absolute ${
                  isSidebarCollapsed ? "left-16 top-3 w-60" : "left-3 right-3 top-14"
                } border-3 border-[var(--ink)] bg-[#101010] shadow-[6px_6px_0px_#000] py-1.5 z-60 max-h-72 overflow-y-auto text-white`}
              >
                <div className="px-3 py-1.5 border-b-2 border-[#262626] bg-[#18181b] flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--yellow)]">
                    Governed Brands ({brands.length})
                  </span>
                  <Link
                    href="/guidelines"
                    onClick={() => {
                      setIsBrandDropdownOpen(false);
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-[10px] font-mono font-bold text-white flex items-center gap-1 hover:text-[var(--yellow)]"
                  >
                    <span>Manage</span>
                    <ExternalLink size={10} />
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
                      className={`w-full text-left px-3 py-2 text-xs font-mono flex items-center justify-between transition-colors cursor-pointer ${
                        b.id === activeBrandId
                          ? "bg-[var(--yellow)] text-[var(--ink)] font-black border-2 border-[var(--ink)] shadow-[2px_2px_0px_#000]"
                          : "text-[#d1d5db] hover:bg-[#202024]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate pr-2">
                        <div className="w-4 h-4 bg-[#F8C200] border border-[var(--ink)] flex items-center justify-center shrink-0">
                          <span className="font-black text-[10px] text-[#1C1C1E] font-mono -mt-0.5">b</span>
                        </div>
                        <span className="truncate font-mono">{b.name}</span>
                      </div>
                      {b.id === activeBrandId && (
                        <Check size={14} className="text-[var(--ink)] stroke-[3]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. New Action CTA Button */}
          <div className={`px-3 py-1.5 shrink-0 ${isSidebarCollapsed ? "flex justify-center" : ""}`}>
            {isSidebarCollapsed ? (
              <Link
                href={isCreator ? "/content" : isAdminOrJudge ? "/judge" : "/audit"}
                title={isCreator ? "Upload Content" : isAdminOrJudge ? "Judge Canvas" : "New Audit"}
                className="w-10 h-10 bg-[var(--yellow)] text-[var(--ink)] border-2 border-[var(--ink)] shadow-[2px_2px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 flex items-center justify-center cursor-pointer transition-all"
              >
                <Plus size={18} className="stroke-[3]" />
              </Link>
            ) : (
              <Link
                href={isCreator ? "/content" : isAdminOrJudge ? "/judge" : "/audit"}
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full flex items-center justify-between h-9 px-3.5 bg-[var(--yellow)] text-[var(--ink)] font-mono font-black text-xs uppercase tracking-wider border-2 border-[var(--ink)] shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 transition-all cursor-pointer"
              >
                <span className="truncate">{isCreator ? "Upload Content" : isAdminOrJudge ? "Judge Canvas" : "New Audit"}</span>
                <Plus size={16} className="shrink-0 stroke-[3]" />
              </Link>
            )}
          </div>

          {/* 5. Global Search Bar */}
          <div className={`px-3 py-1.5 shrink-0 ${isSidebarCollapsed ? "flex justify-center" : ""}`}>
            {isSidebarCollapsed ? (
              <button
                type="button"
                onClick={toggleSidebar}
                className="w-10 h-10 border-2 border-[#333] hover:border-[var(--yellow)] bg-[#18181b] text-[#aaa] flex items-center justify-center cursor-pointer transition-all shadow-[2px_2px_0px_#000]"
                title="Search rules, audits... (⌘K)"
                aria-label="Search"
              >
                <Search size={16} />
              </button>
            ) : (
              <div className="relative flex items-center">
                <Search
                  size={14}
                  className="absolute left-2.5 pointer-events-none text-[#777]"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search rules, audits..."
                  className="w-full h-8 pl-8 pr-12 font-mono text-xs border-2 border-[#333] bg-[#141416] text-white placeholder:text-[#666] focus:border-[var(--yellow)] focus:outline-none transition-all shadow-inner"
                />
                <kbd className="absolute right-2 text-[9px] font-mono px-1.5 py-0.5 border border-[#444] bg-[#202024] text-[var(--yellow)] font-bold pointer-events-none">
                  ⌘K
                </kbd>
              </div>
            )}
          </div>

          {/* Section Heading */}
          {!isSidebarCollapsed && (
            <div className="px-4 pt-3 pb-1">
              <span className="font-mono text-[9px] uppercase tracking-widest font-black text-[#666]">
                NAVIGATION
              </span>
            </div>
          )}

          {/* 6. Navigation Items */}
          <nav
            className={`flex flex-col gap-1.5 py-1 ${
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
                    className={`w-10 h-10 flex items-center justify-center transition-all cursor-pointer border-2 ${
                      isActive
                        ? "bg-[var(--yellow)] text-[var(--ink)] border-[var(--ink)] shadow-[3px_3px_0px_#000] font-black"
                        : "border-[#333] bg-[#18181b] text-[#aaa] hover:text-[var(--yellow)] hover:border-[var(--yellow)]"
                    }`}
                  >
                    <Icon size={18} className={isActive ? "stroke-[2.5]" : ""} />
                  </Link>
                );
              }

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 text-xs font-mono transition-all duration-100 cursor-pointer ${
                    isActive
                      ? "bg-[var(--yellow)] text-[var(--ink)] font-black border-2 border-[var(--ink)] shadow-[4px_4px_0px_#000]"
                      : "text-[#cbd5e1] hover:text-[var(--yellow)] hover:bg-[#18181b] border-2 border-transparent font-bold"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      size={16}
                      className={`shrink-0 ${
                        isActive ? "text-[var(--ink)] stroke-[2.5]" : "text-[#888]"
                      }`}
                    />
                    <span className="leading-tight truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.5 text-[9px] font-mono uppercase font-black shrink-0 border ${
                        isActive
                          ? "bg-[var(--ink)] text-white border-[var(--ink)]"
                          : "bg-[#18181b] text-[var(--yellow)] border-[#444]"
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
        <div className="border-t-3 border-[#262626] bg-[#0c0c0e] shrink-0 flex flex-col gap-2 p-3">
          {/* 7. Theme Toggle */}
          {isSidebarCollapsed ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={toggleTheme}
                className="w-10 h-10 border-2 border-[#333] hover:border-[var(--yellow)] bg-[#18181b] text-[var(--yellow)] flex items-center justify-center cursor-pointer transition-colors shadow-[2px_2px_0px_#000]"
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
              className="w-full flex items-center justify-between px-3 py-1.5 border-2 border-[#333] hover:border-[var(--yellow)] bg-[#141416] text-white text-xs font-mono transition-colors cursor-pointer shadow-[2px_2px_0px_#000]"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle theme mode"
            >
              <div className="flex items-center gap-2">
                <span className="text-[var(--yellow)]">
                  {isDark ? <Sun size={15} /> : <Moon size={15} />}
                </span>
                <span className="font-bold">{isDark ? "Dark Theme" : "Light Theme"}</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 border border-[#444] bg-[#222] text-[var(--yellow)] font-bold">
                {isDark ? "DARK" : "LIGHT"}
              </span>
            </button>
          )}

          {/* 8. User Role Switcher */}
          <div className="relative" ref={roleRef}>
            {isSidebarCollapsed ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                  className="w-10 h-10 border-2 border-[#333] hover:border-[var(--yellow)] bg-[#18181b] flex items-center justify-center cursor-pointer transition-colors shadow-[2px_2px_0px_#000]"
                  title={`Active Role: ${currentRole.toLowerCase()}`}
                  aria-label="Change user role"
                >
                  <span className={`w-3 h-3 rounded-none border border-black ${roleColors[currentRole].dot}`} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 border-2 border-[#333] hover:border-[var(--yellow)] bg-[#141416] text-white text-xs font-mono transition-colors cursor-pointer shadow-[2px_2px_0px_#000]"
                title="Switch active governance role"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-none border border-black shrink-0 ${roleColors[currentRole].dot}`} />
                  <span className="font-bold uppercase tracking-tight">
                    {currentRole.toLowerCase()} ROLE
                  </span>
                </div>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 text-[#888] ${
                    isRoleDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}

            {/* Role Dropdown */}
            {isRoleDropdownOpen && (
              <div
                className={`absolute ${
                  isSidebarCollapsed ? "left-16 bottom-0 w-44" : "left-0 right-0 bottom-9"
                } border-3 border-[var(--ink)] bg-[#101010] shadow-[6px_6px_0px_#000] p-1 z-60 text-white`}
              >
                <div className="px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider font-bold border-b-2 border-[#262626] text-[var(--yellow)] mb-1">
                  SWITCH ROLE
                </div>
                {roles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setCurrentRole(r);
                      setIsRoleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 text-xs font-mono flex items-center justify-between transition-colors cursor-pointer ${
                      currentRole === r
                        ? "bg-[var(--yellow)] text-[var(--ink)] font-black border border-[var(--ink)] shadow-[2px_2px_0px_#000]"
                        : "text-[#d1d5db] hover:bg-[#202024]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-none border border-black shrink-0 ${roleColors[r].dot}`} />
                      <span className="capitalize font-bold">{r.toLowerCase()}</span>
                    </div>
                    {currentRole === r && (
                      <Check size={14} className="text-[var(--ink)] stroke-[3]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 9. User Profile Card & Interactive Logout Popover */}
          <div className="relative" ref={userMenuRef}>
            {isSidebarCollapsed ? (
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-full flex justify-center cursor-pointer focus:outline-none"
                title={`${displayName} (${displayRoleSubtitle}) — click for options`}
                aria-label="User profile menu"
                aria-expanded={isUserMenuOpen}
              >
                <div className="relative">
                  <div
                    className={`w-9 h-9 bg-[var(--pink)] border-2 ${
                      isUserMenuOpen
                        ? "border-[var(--yellow)] shadow-[3px_3px_0px_#000]"
                        : "border-white hover:border-[var(--yellow)] shadow-[2px_2px_0px_#000]"
                    } flex items-center justify-center font-mono font-black text-xs text-[var(--ink)] transition-all`}
                  >
                    {initials}
                  </div>
                  <span
                    className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 border border-black ${roleColors[currentRole].dot}`}
                  />
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`w-full flex items-center justify-between p-2 border-2 ${
                  isUserMenuOpen
                    ? "border-[var(--yellow)] bg-[#1a1a1e]"
                    : "border-[#333] hover:border-[var(--yellow)] bg-[#141416]"
                } shadow-[2px_2px_0px_#000] transition-colors cursor-pointer text-left focus:outline-none`}
                aria-label="User profile menu"
                aria-expanded={isUserMenuOpen}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 shrink-0 bg-[var(--pink)] border-2 border-white flex items-center justify-center font-mono font-black text-xs text-[var(--ink)] shadow-[1px_1px_0px_#000]">
                    {initials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-mono font-black text-white truncate leading-tight">
                      {displayName}
                    </span>
                    <span className="text-[9.5px] font-mono text-[#888] truncate leading-tight mt-0.5">
                      {displayRoleSubtitle}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                  <span
                    className={`w-2.5 h-2.5 rounded-none border border-black ${roleColors[currentRole].dot}`}
                  />
                  <ChevronDown
                    size={12}
                    className={`text-[#888] transition-transform duration-200 ${
                      isUserMenuOpen ? "rotate-180 text-[var(--yellow)]" : ""
                    }`}
                  />
                </div>
              </button>
            )}

            {/* Popover Menu */}
            {isUserMenuOpen && (
              <div
                className={`absolute ${
                  isSidebarCollapsed
                    ? "left-14 bottom-0 w-60"
                    : "left-0 right-0 bottom-full mb-2 w-full"
                } border-3 border-[var(--ink)] bg-[#101010] shadow-[6px_6px_0px_#000] p-2.5 z-60 text-white`}
              >
                {/* User Header Details */}
                <div className="flex items-center gap-2.5 pb-2 border-b-2 border-[#262626]">
                  <div className="w-8 h-8 shrink-0 bg-[var(--pink)] border-2 border-white flex items-center justify-center font-mono font-black text-xs text-[var(--ink)] shadow-[1px_1px_0px_#000]">
                    {initials}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-mono font-black text-white truncate leading-tight">
                      {displayName}
                    </span>
                    <span
                      className="text-[10px] font-mono text-[#888] truncate leading-tight mt-0.5"
                      title={displayEmail}
                    >
                      {displayEmail}
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="px-1 py-0.2 text-[8px] font-mono font-bold bg-[#222] border border-[#444] text-[var(--yellow)] uppercase">
                        {currentRole}
                      </span>
                      {user?.organization_name && (
                        <span
                          className="px-1 py-0.2 text-[8px] font-mono font-medium bg-[#1e293b] border border-[#334155] text-[#93c5fd] truncate max-w-[90px]"
                          title={user.organization_name}
                        >
                          {user.organization_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Profile / Navigation Links */}
                <div className="py-2 flex flex-col gap-1">
                  {isCreator && (
                    <Link
                      href="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-2 py-1.5 text-xs font-mono font-bold text-[#d1d5db] hover:text-black hover:bg-[var(--yellow)] transition-colors border border-transparent hover:border-black hover:shadow-[2px_2px_0px_#000]"
                    >
                      <User size={13} className="shrink-0" />
                      <span>Creator Profile</span>
                    </Link>
                  )}

                  {isBrand && (
                    <Link
                      href="/setup?reconfigure=true"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-2 py-1.5 text-xs font-mono font-bold text-[#d1d5db] hover:text-black hover:bg-[var(--yellow)] transition-colors border border-transparent hover:border-black hover:shadow-[2px_2px_0px_#000]"
                    >
                      <Sliders size={13} className="shrink-0" />
                      <span>Brand Settings</span>
                    </Link>
                  )}

                  <Link
                    href="/dashboard"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs font-mono font-bold text-[#d1d5db] hover:text-black hover:bg-[var(--yellow)] transition-colors border border-transparent hover:border-black hover:shadow-[2px_2px_0px_#000]"
                  >
                    <LayoutDashboard size={13} className="shrink-0" />
                    <span>Dashboard</span>
                  </Link>
                </div>

                {/* Divider */}
                <div className="border-t-2 border-[#262626] my-1" />

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full mt-1 flex items-center justify-center gap-2 px-2.5 py-1.5 text-xs font-mono font-black bg-[#ff4d4d] hover:bg-[#ff3333] text-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer transition-transform"
                >
                  <LogOut size={13} className="stroke-[2.5]" />
                  <span>LOG OUT</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
