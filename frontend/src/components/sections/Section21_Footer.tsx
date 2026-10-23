"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export function Section21_Footer() {
  const footerColumns = [
    {
      title: "Product",
      links: [
        { label: "Supported file types", href: "#" },
        { label: "PDF proofing", href: "#" },
        { label: "Video proofing", href: "#" },
        { label: "Audio proofing", href: "#" },
        { label: "Website proofing", href: "#" },
        { label: "Review Agents AI", href: "#" },
      ],
    },
    {
      title: "Use cases",
      links: [
        { label: "Marketing teams", href: "#" },
        { label: "Creative agencies", href: "#" },
        { label: "Consumer brands", href: "#" },
        { label: "Packaging & Print", href: "#" },
        { label: "Healthcare & Pharma", href: "#" },
        { label: "Enterprise governance", href: "#" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Proofing guide", href: "#" },
        { label: "ROI calculator", href: "#" },
        { label: "Customer stories", href: "#" },
        { label: "Integrations directory", href: "#" },
        { label: "Help center", href: "#" },
        { label: "API docs", href: "#" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About us", href: "#" },
        { label: "Careers", href: "#" },
        { label: "Security & Trust", href: "#" },
        { label: "Sustainability", href: "#" },
        { label: "Contact us", href: "#" },
        { label: "+1 646-569-9038", href: "tel:+16465699038" },
      ],
    },
  ];

  return (
    <footer className="pt-16 pb-10 bg-[#f9fafb] border-t border-gray-200">
      <div className="max-w-[1246px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 mb-12">
          {/* Logo & Description */}
          <div className="lg:col-span-2 flex flex-col items-start">
            <Link href="/" className="mb-4">
              <Image
                src="/images/48-filestage-logo-2x-1-310x50-c-default.webp"
                alt="Filestage"
                width={150}
                height={24}
                className="h-[24px] w-auto object-contain"
              />
            </Link>
            <p className="font-['Lato',sans-serif] text-sm text-[#4b5563] leading-relaxed mb-6 max-w-[320px]">
              The online proofing platform that helps brands and agencies collaborate, catch mistakes, and sign off creative work 30% faster.
            </p>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-6 py-2.5 bg-[#005797] hover:bg-[#004578] text-white text-xs font-bold rounded-full shadow-sm transition-all"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Links Columns */}
          {footerColumns.map((col, idx) => (
            <div key={idx} className="flex flex-col">
              <h4 className="font-['Lato',sans-serif] text-sm font-bold text-[#111827] uppercase tracking-wider mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link, lIdx) => (
                  <li key={lIdx}>
                    <a
                      href={link.href}
                      className="font-['Lato',sans-serif] text-sm text-[#4b5563] hover:text-[#005797] transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
