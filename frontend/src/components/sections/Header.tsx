"use client";

import React, { useState } from "react";
import Link from "next/link";

export function Header() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] h-[72px] bg-white/95 backdrop-blur-md border-b border-[#e5e7eb] transition-all duration-200">
      <div className="max-w-[1246px] mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#005797] to-[#1863dc] flex items-center justify-center text-white shadow-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-['Domine',serif] text-xl font-bold text-[#111827] tracking-tight flex items-center gap-1.5 leading-none">
              Inkloom AI
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="System Active" />
            </span>
            <span className="font-['Lato',sans-serif] text-[10px] text-[#4b5563] uppercase tracking-wider font-semibold">
              Brand Governance
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-7 text-[#111827] text-[15px] font-medium font-['Lato',sans-serif]">
          <Link href="/audit" className="hover:text-[#005797] transition-colors py-2">
            Content Audit
          </Link>

          <Link href="/guidelines" className="hover:text-[#005797] transition-colors py-2">
            Brand Guidelines
          </Link>

          <a href="#features" className="hover:text-[#005797] transition-colors py-2">
            Multi-Modal QA
          </a>

          <Link href="/dashboard" className="hover:text-[#005797] transition-colors py-2">
            Governance Console
          </Link>
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-[#111827] hover:text-[#005797] text-[15px] font-semibold px-3 py-2 transition-colors font-['Lato',sans-serif]"
          >
            Console
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-[#005797] hover:bg-[#004578] text-white font-['Lato',sans-serif] font-bold text-[15px] rounded-full shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            Start Now
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="md:hidden p-2 text-gray-700 hover:text-black focus:outline-none"
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
        <div className="md:hidden bg-white border-b border-gray-200 px-6 py-5 shadow-xl flex flex-col space-y-4">
          <Link href="/audit" onClick={() => setIsMobileOpen(false)} className="text-gray-800 font-medium py-1">
            Content Audit
          </Link>
          <Link href="/guidelines" onClick={() => setIsMobileOpen(false)} className="text-gray-800 font-medium py-1">
            Brand Guidelines
          </Link>
          <Link href="/dashboard" onClick={() => setIsMobileOpen(false)} className="text-gray-800 font-medium py-1">
            Governance Console
          </Link>
          <a href="#faq" onClick={() => setIsMobileOpen(false)} className="text-gray-800 font-medium py-1">
            FAQs
          </a>
          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2.5">
            <Link
              href="/dashboard"
              className="w-full text-center py-2.5 text-gray-700 font-semibold"
            >
              Console Login
            </Link>
            <Link
              href="/dashboard"
              className="w-full text-center py-3 bg-[#005797] text-white font-bold rounded-full shadow-md"
            >
              Start Now
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
