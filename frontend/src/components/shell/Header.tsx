"use client";

// Deprecated: The upper header bar has been removed and its components unified into Sidebar.
export function Header() {
  const rawPathname = usePathname();
  const pathname = rawPathname || "";
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
  } = useApp();

  const isDark = theme === "dark";

  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // Derive breadcrumb from pathname
  const getBreadcrumbTitle = () => {
    if (pathname === "/" || pathname === "/dashboard") return "Dashboard";
    if (pathname.startsWith("/content")) return "Content Setup";
    if (pathname.startsWith("/audit")) return "Audit";
    if (pathname.startsWith("/guidelines")) return "Guidelines";
    if (pathname.startsWith("/api-console")) return "API Console";
    return "Dashboard";
  };

  const roles: { role: UserRole; name: string; color: string }[] = [
    { role: "CREATOR", name: "Alex Rivera (Creator)", color: "bg-emerald-500" },
    { role: "JUDGE", name: "Sasha Bloom (Judge)", color: "bg-amber-500" },
    { role: "ADMIN", name: "Jordan Vance (Admin)", color: "bg-purple-500" },
    { role: "REVIEWER", name: "Reviewer (Legacy)", color: "bg-blue-500" },
    { role: "MANAGER", name: "Manager (Legacy)", color: "bg-indigo-500" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 h-16 backdrop-blur-md border-b shadow-2xs z-40 flex items-center justify-between px-3 sm:px-5 lg:px-6 font-sans transition-all duration-300 ${
        isSidebarCollapsed ? "lg:left-20" : "lg:left-64"
      } ${
        isDark ? "bg-[#1b1b1f]/95 border-[#3b3c44] text-[#e3e2e6]" : "bg-white/95 border-[#cbd5e1] text-[#111827]"
      }`}
    >
      {/* Left side: Mobile Menu, Breadcrumb & Brand Selector */}
      <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
        {/* Mobile Hamburger */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`h-9 w-9 rounded-lg border lg:hidden flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
            isDark
              ? "bg-[#1f1f23] border-[#3b3c44] text-white hover:bg-[#292a2d]"
              : "bg-white border-[#cbd5e1] text-[#111827] hover:bg-[#f4f4f4]"
          }`}
          title="Toggle Navigation Menu"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        {/* Breadcrumb (Visible on Tablet/Desktop) */}
        <div className="hidden md:flex items-center gap-2 font-sans text-xs shrink-0">
          <span className={isDark ? "text-[#9ca3af] font-medium" : "text-[#64748b] font-medium"}>
            Inkloom
          </span>
          <span className={`material-symbols-outlined text-[13px] ${isDark ? "text-[#6b7280]" : "text-[#9ca3af]"}`}>
            chevron_right
          </span>
          <span className={`font-bold ${isDark ? "text-white" : "text-[#111827]"}`}>
            {getBreadcrumbTitle()}
          </span>
        </div>

        {/* Separator between Breadcrumb and Brand selector */}
        <div className={`hidden md:block w-px h-5 ${isDark ? "bg-[#3b3c44]" : "bg-[#cbd5e1]"}`} />

        {/* Active Brand Selector with Authentic Blinkit Logo */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
            className={`flex items-center gap-2 h-9 px-2.5 rounded-lg border shadow-2xs transition-all cursor-pointer ${
              isDark
                ? "bg-[#1f1f23] border-[#3b3c44] text-white hover:bg-[#292a2d]"
                : "bg-white border-[#cbd5e1] text-[#111827] hover:bg-[#f8fafc]"
            }`}
          >
            {/* Blinkit Logo Mark: Yellow box + bold b + accent */}
            <div className="w-5 h-5 rounded-md bg-[#F8C200] flex items-center justify-center shrink-0 border border-[#e5b300]/80 shadow-2xs">
              <span className="font-black text-[12px] text-[#1C1C1E] font-sans -mt-0.5 leading-none">b</span>
              <span className="w-1 h-1 rounded-full bg-[#00A36C] -ml-0.5 -mt-1.5" />
            </div>

            <span className="font-sans text-xs font-bold leading-none truncate max-w-[100px] sm:max-w-[140px]">
              {activeBrand ? activeBrand.name : "Blinkit"}
            </span>

            <span className={`material-symbols-outlined text-[16px] -ml-0.5 ${isDark ? "text-[#9ca3af]" : "text-[#64748b]"}`}>
              expand_more
            </span>
          </button>

          {isBrandDropdownOpen && (
            <div
              className={`absolute left-0 mt-1.5 w-64 rounded-xl border shadow-xl py-1 z-50 max-h-80 overflow-y-auto ${
                isDark ? "bg-[#1b1b1f] border-[#3b3c44] text-white" : "bg-white border-[#cbd5e1] text-[#111827]"
              }`}
              onMouseLeave={() => setIsBrandDropdownOpen(false)}
            >
              <div
                className={`px-3 py-2 border-b flex items-center justify-between ${
                  isDark ? "border-[#3b3c44] bg-[#121316]" : "border-[#cbd5e1] bg-[#f8fafc]"
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
                  onClick={() => setIsBrandDropdownOpen(false)}
                  className={`text-[11px] hover:underline font-bold ${
                    isDark ? "text-[#d2bbff]" : "text-primary"
                  }`}
                >
                  Manage
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
                  className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    b.id === activeBrandId
                      ? isDark
                        ? "bg-[#7c3aed]/20 text-[#d2bbff] font-bold"
                        : "bg-[#ebf6ff] text-primary font-bold"
                      : isDark
                      ? "text-[#d1d5db] hover:bg-[#292a2d]"
                      : "text-[#374151] hover:bg-[#f8fafc]"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <div className="w-4 h-4 rounded bg-[#F8C200] flex items-center justify-center shrink-0">
                      <span className="font-black text-[10px] text-[#1C1C1E] font-sans -mt-0.5">b</span>
                    </div>
                    <span className="truncate font-sans font-medium">{b.name}</span>
                  </div>
                  {b.id === activeBrandId && (
                    <span
                      className={`material-symbols-outlined text-[15px] ${
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

      {/* Right side: Search, Theme Toggle, Role Switcher, New Audit */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Search Input (Hidden on mobile, expands smoothly on focus) */}
        <div className="relative hidden lg:flex items-center">
          <span className={`material-symbols-outlined absolute left-2.5 text-[15px] pointer-events-none ${
            isDark ? "text-[#9ca3af]" : "text-[#64748b]"
          }`}>
            search
          </span>
          <input
            type="text"
            placeholder="Search rules, audits..."
            className={`w-44 xl:w-56 h-9 pl-8 pr-8 rounded-lg font-sans text-xs border transition-all focus:outline-none focus:w-64 ${
              isDark
                ? "bg-[#121316] border-[#3b3c44] text-white placeholder:text-[#9ca3af] focus:border-[#7c3aed]"
                : "bg-[#f8fafc] border-[#cbd5e1] text-[#111827] placeholder:text-[#64748b] focus:border-primary focus:bg-white"
            }`}
          />
          <kbd className={`absolute right-2 text-[10px] font-mono px-1.5 py-0.5 rounded border pointer-events-none ${
            isDark ? "bg-[#1f1f23] border-[#3b3c44] text-[#9ca3af]" : "bg-white border-[#cbd5e1] text-[#64748b]"
          }`}>
            ⌘K
          </kbd>
        </div>

        {/* Theme Toggle Button (Premium SVG icon with smooth glow) */}
        <button
          type="button"
          onClick={toggleTheme}
          suppressHydrationWarning
          className={`h-9 w-9 rounded-lg border shadow-2xs transition-all cursor-pointer flex items-center justify-center shrink-0 ${
            isDark
              ? "bg-[#1f1f23] border-[#3b3c44] text-amber-400 hover:bg-[#292a2d] hover:border-amber-400/50"
              : "bg-white border-[#cbd5e1] text-[#64748b] hover:bg-[#f8fafc] hover:text-[#111827] hover:border-[#94a3b8]"
          }`}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle theme mode"
        >
          {isDark ? (
            <svg className="w-4 h-4 text-amber-400 transition-transform duration-300 hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-[#64748b] transition-transform duration-300 hover:-rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Premium User Role Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            className={`h-9 flex items-center gap-1.5 px-2.5 rounded-lg border shadow-2xs transition-all cursor-pointer ${
              isDark
                ? "bg-[#1f1f23] border-[#3b3c44] hover:bg-[#292a2d] text-white"
                : "bg-white border-[#cbd5e1] hover:bg-[#f8fafc] text-[#111827]"
            }`}
            title="User Role Switcher"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              currentRole === "MANAGER" ? "bg-purple-500" : currentRole === "REVIEWER" ? "bg-blue-500" : "bg-emerald-500"
            }`} />
            <span className="font-sans text-xs font-semibold capitalize hidden sm:inline">
              {currentRole.toLowerCase()}
            </span>
            <span className={`material-symbols-outlined text-[15px] -ml-0.5 ${isDark ? "text-[#9ca3af]" : "text-[#64748b]"}`}>
              expand_more
            </span>
          </button>

          {isRoleDropdownOpen && (
            <div
              className={`absolute right-0 mt-1.5 w-52 rounded-xl border shadow-xl p-1 z-50 ${
                isDark ? "bg-[#1b1b1f] border-[#3b3c44] text-white" : "bg-white border-[#cbd5e1] text-[#111827]"
              }`}
              onMouseLeave={() => setIsRoleDropdownOpen(false)}
            >
              {roles.map((item) => (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => {
                    setCurrentRole(item.role);
                    setIsRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    currentRole === item.role
                      ? isDark
                        ? "bg-[#7c3aed]/20 text-[#d2bbff] font-bold"
                        : "bg-[#ebf6ff] text-primary font-bold"
                      : isDark
                      ? "text-[#d1d5db] hover:bg-[#292a2d]"
                      : "text-[#374151] hover:bg-[#f8fafc]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${item.color}`} />
                    <span className="font-sans font-medium">{item.name}</span>
                  </div>
                  {currentRole === item.role && (
                    <span
                      className={`material-symbols-outlined text-[15px] ${
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

        {/* Action Button: New Audit */}
        <Link
          href="/audit"
          className={`h-9 inline-flex items-center gap-1.5 px-3 rounded-lg font-sans text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0 ${
            isDark ? "bg-[#7c3aed] hover:bg-[#6d28d9] text-white" : "bg-[#005797] hover:bg-[#004578] text-white"
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          <span className="hidden sm:inline">New Audit</span>
        </Link>
      </div>
    </header>
  );
}

export default Header;
