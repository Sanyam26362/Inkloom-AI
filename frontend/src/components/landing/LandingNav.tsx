"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import { useApp } from "@/context/AppContext";

export function LandingNav() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("");
  const { openAuthModal } = useApp();

  const handleBookDemo = () => {
    setIsMobileOpen(false);
    const demoEl = document.getElementById("demo");
    if (demoEl) {
      demoEl.scrollIntoView({ behavior: "smooth" });
    } else {
      openAuthModal();
    }
  };

  const handleTabClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    setIsMobileOpen(false);
    const el = document.getElementById(targetId);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const sectionIds = ["how-it-works", "solutions", "pricing", "trust", "faq"];
      const scrollY = window.scrollY + 120;

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const id = sectionIds[i];
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          if (scrollY >= top) {
            setActiveTab(id);
            return;
          }
        }
      }
      setActiveTab("");
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { num: "01", label: "Product", href: "#how-it-works", id: "how-it-works" },
    { num: "02", label: "Solutions", href: "#solutions", id: "solutions" },
    { num: "03", label: "Pricing", href: "#pricing", id: "pricing" },
    { num: "04", label: "Security", href: "#trust", id: "trust" },
    { num: "05", label: "FAQ", href: "#faq", id: "faq" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--nb-cream)] border-b-[3px] border-[var(--nb-ink)]">
      <div className="w-full flex items-stretch justify-between min-h-[64px]">
        {/* Block 1 (Yellow): Logo block */}
        <div className="flex items-center gap-3 px-5 sm:px-7 py-3 bg-[var(--nb-yellow)] border-r-[3px] border-[var(--nb-ink)] select-none shrink-0">
          <div className="w-8 h-8 bg-[var(--nb-ink)] text-white flex items-center justify-center font-serif italic font-black text-lg border-2 border-[var(--nb-ink)] shadow-[2px_2px_0_var(--nb-ink)]">
            i
          </div>
          <span
            className="text-xl sm:text-2xl tracking-tighter uppercase text-[var(--nb-ink)]"
            style={{ fontFamily: "var(--font-archivo), sans-serif", fontWeight: 900 }}
          >
            INKLOOM AI
          </span>
        </div>

        {/* Centre tabs (mono, numbered) - Hidden below 900px */}
        <nav
          aria-label="Primary Navigation"
          className="hidden min-[900px]:flex items-stretch flex-1 divide-x-[3px] divide-[var(--nb-ink)]"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => handleTabClick(e, item.id)}
                className={`flex-1 flex items-center justify-center px-3 py-2 text-[14px] font-bold tracking-tight uppercase transition-colors duration-100 ${
                  isActive
                    ? "bg-[var(--nb-ink)] text-[var(--nb-cream)]"
                    : "text-[var(--nb-ink)] hover:bg-[var(--nb-yellow)]"
                }`}
              >
                <span className="opacity-70 mr-1.5">{item.num}</span>
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* Right block: Auth & Demo actions - Desktop */}
        <div className="hidden min-[900px]:flex items-stretch border-l-[3px] border-[var(--nb-ink)] shrink-0">
          <button
            type="button"
            onClick={handleBookDemo}
            className="px-5 py-2 bg-[var(--nb-yellow)] text-[var(--nb-ink)] font-bold text-[13px] tracking-wider uppercase border-r-[3px] border-[var(--nb-ink)] hover:bg-[#ffe647] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            BOOK A DEMO
          </button>

          <Show when="signed-out">
            <button
              type="button"
              onClick={() => openAuthModal()}
              className="px-6 py-2 bg-[var(--nb-pink)] text-[var(--nb-ink)] font-bold text-[13px] tracking-wider uppercase hover:bg-[#ff8ec0] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              LOGIN ↗
            </button>
          </Show>

          <Show when="signed-in">
            <div className="flex items-center gap-4 px-5 bg-[var(--nb-pink)]">
              <Link
                href="/dashboard"
                className="text-[13px] font-bold tracking-wider uppercase text-[var(--nb-ink)] hover:underline flex items-center gap-1"
              >
                OPEN CONSOLE →
              </Link>
              <UserButton />
            </div>
          </Show>
        </div>

        {/* Mobile Hamburger Button (< 900px) */}
        <div className="flex min-[900px]:hidden items-center px-4">
          <button
            type="button"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="w-11 h-11 bg-[var(--nb-yellow)] border-[3px] border-[var(--nb-ink)] flex flex-col items-center justify-center gap-1.5 shadow-[3px_3px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileOpen}
          >
            {isMobileOpen ? (
              <span className="font-bold text-xl leading-none">✕</span>
            ) : (
              <>
                <span className="w-5 h-[3px] bg-[var(--nb-ink)] block"></span>
                <span className="w-5 h-[3px] bg-[var(--nb-ink)] block"></span>
                <span className="w-5 h-[3px] bg-[var(--nb-ink)] block"></span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Full-screen mobile menu drawer below 900px */}
      {isMobileOpen && (
        <div className="min-[900px]:hidden fixed inset-x-0 top-[67px] bottom-0 z-50 bg-[var(--nb-cream)] border-b-[3px] border-[var(--nb-ink)] p-6 overflow-y-auto flex flex-col justify-between">
          <nav aria-label="Mobile Navigation" className="flex flex-col divide-y-[3px] divide-[var(--nb-ink)] border-[3px] border-[var(--nb-ink)] bg-white shadow-[6px_6px_0_var(--nb-ink)]">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => handleTabClick(e, item.id)}
                className="px-5 py-4 text-lg font-bold uppercase tracking-tight text-[var(--nb-ink)] hover:bg-[var(--nb-yellow)] flex items-center justify-between"
              >
                <span>
                  <span className="opacity-60 mr-3">{item.num}</span>
                  {item.label}
                </span>
                <span>→</span>
              </a>
            ))}
          </nav>

          <div className="flex flex-col gap-3 mt-6 pt-6 border-t-[3px] border-[var(--nb-ink)]">
            <button
              type="button"
              onClick={handleBookDemo}
              className="w-full py-4 bg-[var(--nb-yellow)] text-[var(--nb-ink)] font-bold text-base uppercase tracking-wider border-[3px] border-[var(--nb-ink)] shadow-[4px_4px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
              BOOK A DEMO
            </button>

            <Show when="signed-out">
              <button
                type="button"
                onClick={() => {
                  setIsMobileOpen(false);
                  openAuthModal();
                }}
                className="w-full py-4 bg-[var(--nb-pink)] text-[var(--nb-ink)] font-bold text-base uppercase tracking-wider border-[3px] border-[var(--nb-ink)] shadow-[4px_4px_0_var(--nb-ink)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              >
                LOGIN ↗
              </button>
            </Show>

            <Show when="signed-in">
              <div className="flex items-center justify-between p-4 bg-[var(--nb-pink)] border-[3px] border-[var(--nb-ink)] shadow-[4px_4px_0_var(--nb-ink)]">
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileOpen(false)}
                  className="font-bold text-base uppercase tracking-wider text-[var(--nb-ink)]"
                >
                  OPEN CONSOLE →
                </Link>
                <UserButton />
              </div>
            </Show>
          </div>
        </div>
      )}
    </header>
  );
}
