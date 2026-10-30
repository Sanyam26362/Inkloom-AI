import React from "react";
import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="w-full bg-[var(--nb-ink)] text-[var(--nb-cream)] border-t-4 border-[var(--nb-ink)] pt-16 pb-12 px-6 sm:px-10 lg:px-16 select-none">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-12 border-b-2 border-white/20">
          {/* Left Brand Column (4 cols) */}
          <div className="md:col-span-4 flex flex-col gap-6">
            <Link href="/" className="flex items-center gap-3 cursor-pointer group">
              <div className="w-8 h-8 bg-[var(--nb-yellow)] text-[var(--nb-ink)] flex items-center justify-center font-serif italic font-black text-lg border-2 border-white shadow-[2px_2px_0_white] group-hover:scale-105 transition-transform">
                B
              </div>
              <span
                className="text-2xl tracking-tighter text-white"
                style={{ fontFamily: "var(--font-archivo), sans-serif", fontWeight: 900 }}
              >
                BrandLens
              </span>
            </Link>

            <p className="nb-mono text-sm sm:text-base font-bold text-[var(--nb-cream)] opacity-90 max-w-sm leading-relaxed">
              Brand governance, on the record.
            </p>
          </div>

          {/* Right Navigation Columns (8 cols: 4 x 2) */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {/* Column 1: Product */}
            <div className="flex flex-col gap-3">
              <span className="nb-mono text-xs font-black uppercase tracking-widest text-[var(--nb-yellow)] mb-1">
                Product
              </span>
              <a
                href="#how-it-works"
                className="nb-mono text-xs sm:text-sm text-white/80 hover:text-white hover:underline transition-colors"
              >
                How it works
              </a>
              <a
                href="#solutions"
                className="nb-mono text-xs sm:text-sm text-white/80 hover:text-white hover:underline transition-colors"
              >
                Solutions
              </a>
              <a
                href="#pricing"
                className="nb-mono text-xs sm:text-sm text-white/80 hover:text-white hover:underline transition-colors"
              >
                Pricing
              </a>
              <a
                href="#trust"
                className="nb-mono text-xs sm:text-sm text-white/80 hover:text-white hover:underline transition-colors"
              >
                Security
              </a>
            </div>

            {/* Column 2: Company */}
            <div className="flex flex-col gap-3">
              <span className="nb-mono text-xs sm:text-sm font-black uppercase tracking-widest text-[var(--nb-yellow)] mb-1">
                Company
              </span>
              <a
                href="#how-it-works"
                className="nb-mono text-xs sm:text-sm text-white/80 hover:text-white hover:underline transition-colors"
              >
                About
              </a>
              <a
                href="mailto:contact@brandlens.ai"
                className="nb-mono text-xs sm:text-sm text-white/80 hover:text-white hover:underline transition-colors"
              >
                Contact
              </a>
              <a
                href="mailto:careers@brandlens.ai"
                className="nb-mono text-xs sm:text-sm text-white/80 hover:text-white hover:underline transition-colors"
              >
                Careers
              </a>
            </div>

            {/* Column 3: Resources */}
            <div className="flex flex-col gap-3">
              <span className="nb-mono text-xs sm:text-sm font-black uppercase tracking-widest text-[var(--nb-yellow)] mb-1">
                Resources
              </span>
              <Link
                href="/guidelines"
                className="nb-mono text-xs sm:text-sm text-white/80 hover:text-white hover:underline transition-colors"
              >
                Docs
              </Link>
              <a
                href="https://inkloom-ai-backend.onrender.com/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="nb-mono text-xs sm:text-sm text-white/80 hover:text-white hover:underline transition-colors flex items-center gap-1"
              >
                <span>API</span>
                <span className="text-[10px] opacity-70">↗</span>
              </a>
              <a
                href="https://inkloom-ai-backend.onrender.com/health"
                target="_blank"
                rel="noopener noreferrer"
                className="nb-mono text-xs sm:text-sm text-white/80 hover:text-white hover:underline transition-colors flex items-center gap-1"
              >
                <span>Status</span>
                <span className="text-[10px] opacity-70">↗</span>
              </a>
            </div>

            {/* Column 4: Legal */}
            <div className="flex flex-col gap-3">
              <span className="nb-mono text-xs sm:text-sm font-black uppercase tracking-widest text-[var(--nb-yellow)] mb-1">
                Legal
              </span>
              <a
                href="#trust"
                className="nb-mono text-xs sm:text-sm text-white/80 hover:text-white hover:underline transition-colors"
              >
                Privacy
              </a>
              <a
                href="#trust"
                className="nb-mono text-xs sm:text-sm text-white/80 hover:text-white hover:underline transition-colors"
              >
                Terms
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="nb-mono text-xs sm:text-sm text-white/80">
            © 2026 BrandLens. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="nb-mono text-xs font-bold text-[var(--nb-yellow)] hover:underline"
            >
              Console Start →
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
