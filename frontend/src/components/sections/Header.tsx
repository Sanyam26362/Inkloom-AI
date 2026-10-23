"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export function Header() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] h-[72px] bg-white/95 backdrop-blur-md border-b border-[#e5e7eb] transition-all duration-200">
      <div className="max-w-[1246px] mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Image
            src="/images/48-filestage-logo-2x-1-310x50-c-default.webp"
            alt="Filestage"
            width={155}
            height={25}
            className="h-[25px] w-auto object-contain"
            priority
          />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-7 text-[#111827] text-[15px] font-medium font-['Lato',sans-serif]">
          <div className="relative group flex items-center gap-1.5 cursor-pointer hover:text-[#005797] transition-colors py-2">
            <span>Product</span>
            <svg className="w-3.5 h-3.5 text-[#4b5563] group-hover:text-[#005797] transition-transform duration-200 group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <div className="relative group flex items-center gap-1.5 cursor-pointer hover:text-[#005797] transition-colors py-2">
            <span>Use cases</span>
            <svg className="w-3.5 h-3.5 text-[#4b5563] group-hover:text-[#005797] transition-transform duration-200 group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <a href="#pricing" className="hover:text-[#005797] transition-colors">
            Pricing
          </a>

          <div className="relative group flex items-center gap-1.5 cursor-pointer hover:text-[#005797] transition-colors py-2">
            <span>Resources</span>
            <svg className="w-3.5 h-3.5 text-[#4b5563] group-hover:text-[#005797] transition-transform duration-200 group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-[#111827] hover:text-[#005797] text-[15px] font-semibold px-3 py-2 transition-colors font-['Lato',sans-serif]"
          >
            Login
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
          <Link href="#features" onClick={() => setIsMobileOpen(false)} className="text-gray-800 font-medium py-1">
            Product
          </Link>
          <Link href="#use-cases" onClick={() => setIsMobileOpen(false)} className="text-gray-800 font-medium py-1">
            Use cases
          </Link>
          <Link href="#pricing" onClick={() => setIsMobileOpen(false)} className="text-gray-800 font-medium py-1">
            Pricing
          </Link>
          <Link href="#faq" onClick={() => setIsMobileOpen(false)} className="text-gray-800 font-medium py-1">
            Resources
          </Link>
          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2.5">
            <Link
              href="/dashboard"
              className="w-full text-center py-2.5 text-gray-700 font-semibold"
            >
              Login
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
