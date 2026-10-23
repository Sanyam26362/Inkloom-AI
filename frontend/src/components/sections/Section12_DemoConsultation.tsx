"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export function Section12_DemoConsultation() {
  const perks = [
    "Tailored audit walkthrough using your collateral or the Blinkit benchmark profile",
    "Live demonstration of pgvector semantic guideline retrieval in under 200ms",
    "Hands-on test of the reverse-offset PII scrubber for confidential entity safety",
    "Walkthrough of role-based approvals (Creator, Reviewer, Manager)",
    "Custom configuration of banned terms, approved claims, and WCAG contrast rules",
  ];

  return (
    <section id="demo" className="py-20 bg-[#f9fafb]">
      <div className="max-w-[1164px] mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl border border-gray-200/90 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-center">
          {/* Left Column: Demo Information */}
          <div className="lg:col-span-7 p-8 sm:p-12 lg:p-14">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-[#005797] text-xs font-bold uppercase tracking-wider mb-4">
              Interactive Guided Session
            </span>

            <h2 className="font-['Domine',serif] text-2xl sm:text-[31px] font-bold text-[#111827] leading-[1.3] mb-4">
              See how Inkloom AI automates brand governance in 30 minutes
            </h2>

            <p className="font-['Lato',sans-serif] text-base sm:text-lg text-[#4b5563] leading-relaxed mb-6">
              Experience automated brand auditing across copy, audio voiceovers, and video reels with zero setup friction.
            </p>

            <h4 className="font-['Lato',sans-serif] text-sm font-bold uppercase tracking-wider text-[#111827] mb-3">
              Included in the guided walkthrough:
            </h4>

            <ul className="space-y-3 mb-8">
              {perks.map((perk, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm sm:text-base text-[#374151]">
                  <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{perk}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex justify-center items-center px-10 py-3.5 font-['Lato',sans-serif] text-base font-bold text-white bg-[#005797] hover:bg-[#004578] rounded-full shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                Start Now
              </Link>
              <Link
                href="/audit"
                className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-3.5 font-['Lato',sans-serif] text-base font-bold text-[#111827] hover:text-[#005797] border border-gray-300 rounded-full hover:bg-gray-50 transition-all duration-300"
              >
                Audit Workspace
              </Link>
            </div>
          </div>

          {/* Right Column: Team image */}
          <div className="lg:col-span-5 h-full relative min-h-[320px] lg:min-h-full bg-gray-100 flex items-center justify-center p-6">
            <div className="relative w-full h-full max-w-[420px] rounded-2xl overflow-hidden shadow-lg border border-white">
              <Image
                src="/images/16-book-a-demo-with-our-sales-team-1024x787.webp"
                alt="Book a walkthrough with the Inkloom AI team"
                width={500}
                height={384}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
