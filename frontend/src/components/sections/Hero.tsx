"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export function Hero() {
  return (
    <section className="relative pt-[100px] pb-16 md:pt-[120px] md:pb-20 bg-background overflow-hidden font-sans">
      <div className="max-w-[1246px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Headline, Description & CTAs */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            <h1 className="mb-4 font-serif text-3xl sm:text-4xl leading-[1.2] text-left text-equally-action-color font-bold">
              Autonomous brand governance &amp; multi-modal content auditing
            </h1>

            <p className="mb-8 font-sans text-base leading-[1.4] text-left text-text-muted max-w-[549px]">
              Audit marketing copy, audio voiceovers, and video reels against approved brand guidelines, prohibited terminology, and WCAG accessibility standards before publication.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto mb-6">
              <Link
                href="/setup"
                className="flex justify-center items-center px-12 py-3.5 font-sans text-base font-bold leading-[1.4] text-center text-background bg-primary hover:bg-[#004578] rounded-full cursor-pointer transition-all duration-300 ease-out shadow-sm hover:shadow-md"
              >
                🚀 Start Demo (Blinkit)
              </Link>

              <Link
                href="/judge"
                className="flex justify-center items-center px-12 py-3.5 font-sans text-base font-bold leading-[1.4] text-center text-primary border-2 border-primary rounded-full cursor-pointer transition-all duration-300 ease-out hover:bg-blue-50/60"
              >
                ⚖️ Judge Canvas
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-2xs text-text-muted font-sans">
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
            <div className="relative w-full max-w-[651px] rounded-xl overflow-hidden shadow-2xl border border-palette-1 bg-background group">
              <Image
                src="/images/11-with-vs-without-filestage-header.webp"
                alt="Brand Governance with vs without BrandLens"
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
