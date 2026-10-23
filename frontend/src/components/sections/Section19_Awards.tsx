"use client";

import React from "react";

export function Section19_Awards() {
  const awards = [
    { title: "G2 Leader", sub: "Enterprise Proofing", year: "2026" },
    { title: "Highest User Adoption", sub: "Marketing Teams", year: "2026" },
    { title: "Best Usability", sub: "Design & Creative", year: "2026" },
    { title: "Easiest Admin", sub: "Implementation Index", year: "2026" },
    { title: "Users Love Us", sub: "4.9 / 5 Rating", year: "Top Ranked" },
  ];

  return (
    <section className="py-14 bg-[#f9fafb] border-y border-gray-200/70">
      <div className="max-w-[1164px] mx-auto px-4 sm:px-6 text-center">
        <p className="font-['Lato',sans-serif] text-xs font-bold uppercase tracking-widest text-gray-500 mb-8">
          Recognized by thousands of verified reviews across G2, Capterra, and TrustRadius
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {awards.map((award, idx) => (
            <div
              key={idx}
              className="px-6 py-4 bg-white rounded-xl border border-gray-200/90 shadow-sm flex flex-col items-center min-w-[170px] hover:shadow-md transition-shadow"
            >
              <div className="w-8 h-8 rounded-full bg-amber-100/80 text-amber-600 flex items-center justify-center mb-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <span className="font-['Lato',sans-serif] font-bold text-sm text-[#111827]">
                {award.title}
              </span>
              <span className="font-['Lato',sans-serif] text-xs text-[#4b5563]">
                {award.sub}
              </span>
              <span className="text-[10px] font-semibold text-[#005797] mt-1 uppercase">
                {award.year}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
