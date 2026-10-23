"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export function Hero() {
  return (
    <section className="relative pt-[110px] pb-16 md:pt-[130px] md:pb-24 bg-white overflow-hidden">
      <div className="max-w-[1246px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Headline, Description & CTAs */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            <span className="inline-block px-3.5 py-1 rounded-full bg-blue-50 text-[#005797] font-['Lato',sans-serif] text-xs font-bold uppercase tracking-wider mb-4 border border-blue-100">
              Computational Brand Adherence
            </span>

            <h1 className="font-['Domine',serif] text-3xl sm:text-4xl lg:text-[45px] font-bold text-[#111827] leading-[1.2] mb-5 tracking-tight">
              Autonomous brand governance & multi-modal content auditing
            </h1>

            <p className="font-['Lato',sans-serif] text-base sm:text-lg text-[#4b5563] leading-[1.5] mb-8 max-w-[540px]">
              Audit marketing copy, audio voiceovers, and video reels against approved brand guidelines, prohibited terminology, and WCAG accessibility standards before publication.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto mb-6">
              <Link
                href="/dashboard"
                className="inline-flex justify-center items-center px-10 py-3.5 font-['Lato',sans-serif] text-base lg:text-[18px] font-bold text-white bg-[#005797] hover:bg-[#004578] rounded-full shadow-md hover:shadow-lg transition-all duration-300 ease-out transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                Start Now
              </Link>

              <Link
                href="/audit"
                className="inline-flex justify-center items-center px-9 py-3.5 font-['Lato',sans-serif] text-base lg:text-[18px] font-bold text-[#005797] hover:text-[#004578] bg-transparent border-2 border-[#005797] hover:border-[#004578] rounded-full hover:bg-blue-50/60 transition-all duration-300 ease-out cursor-pointer"
              >
                Audit Workspace
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-xs text-[#6b7280] font-['Lato',sans-serif]">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Multi-Modal (Text, Audio, Video)
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                pgvector Semantic Search
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Reverse-Offset PII Scrubbing
              </span>
            </div>
          </div>

          {/* Right Column: Comparison Graphic */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[650px] rounded-xl overflow-hidden shadow-2xl border border-gray-100/80 bg-white group">
              <Image
                src="/images/11-with-vs-without-filestage-header.webp"
                alt="Brand Governance with vs without Inkloom AI"
                width={651}
                height={511}
                className="w-full h-auto object-cover transform group-hover:scale-[1.01] transition-transform duration-500 ease-out"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
