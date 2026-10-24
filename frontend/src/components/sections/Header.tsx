"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";

export function Header() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { theme, toggleTheme } = useApp();

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] h-[72px] bg-background/95 backdrop-blur-md border-b border-palette-1 font-sans text-base leading-[1.4] text-text-primary transition-all duration-200">
      <div className="max-w-[1246px] mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-sm bg-primary flex items-center justify-center text-background font-bold text-sm shadow-2xs">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="font-serif text-xl font-bold text-equally-action-color tracking-tight leading-none">
            Inkloom AI
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-7 text-xs font-medium font-sans text-equally-action-color">
          <Link href="/audit" className="hover:text-primary transition-colors py-2">
            Content Audit
          </Link>

          <Link href="/guidelines" className="hover:text-primary transition-colors py-2">
            Brand Guidelines
          </Link>

          <a href="#features" className="hover:text-primary transition-colors py-2">
            Multi-Modal QA
          </a>

          <Link href="/dashboard" className="hover:text-primary transition-colors py-2">
            Governance Console
          </Link>
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-full border border-palette-1 hover:bg-palette-7/60 text-equally-action-color transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme mode"
            suppressHydrationWarning
          >
            <span className="material-symbols-outlined text-[18px]" suppressHydrationWarning>
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
          </button>

          <Link
            href="/dashboard"
            className="text-equally-action-color hover:text-primary text-xs font-bold px-3 py-2 transition-colors font-sans"
          >
            Console
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-primary hover:bg-[#004578] text-background font-sans font-bold text-xs rounded-full shadow-2xs transition-all duration-200 cursor-pointer"
          >
            Start Now
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="md:hidden p-2 text-text-muted hover:text-equally-action-color focus:outline-none"
          aria-label="Toggle Navigation"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileOpen && (
        <div className="md:hidden bg-background border-b border-border px-6 py-5 shadow-xl flex flex-col space-y-4">
          <Link href="/audit" onClick={() => setIsMobileOpen(false)} className="text-equally-action-color font-medium py-1">
            Content Audit
          </Link>
          <Link href="/guidelines" onClick={() => setIsMobileOpen(false)} className="text-equally-action-color font-medium py-1">
            Brand Guidelines
          </Link>
          <Link href="/dashboard" onClick={() => setIsMobileOpen(false)} className="text-equally-action-color font-medium py-1">
            Governance Console
          </Link>
          <a href="#faq" onClick={() => setIsMobileOpen(false)} className="text-equally-action-color font-medium py-1">
            FAQs
          </a>
          <div className="pt-3 border-t border-palette-1 flex flex-col gap-2.5">
            <Link
              href="/dashboard"
              className="w-full text-center py-2.5 text-text-muted font-bold text-xs"
            >
              Console Login
            </Link>
            <Link
              href="/dashboard"
              className="w-full text-center py-3 bg-primary text-background font-bold text-xs rounded-xl shadow-sm"
            >
              Start Now
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
