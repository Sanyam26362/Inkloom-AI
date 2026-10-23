"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export function Section11_Checkpoint() {
  return (
    <section className="py-16 bg-background text-center font-sans text-base leading-[1.4] text-text-primary">
      <div className="max-w-[1164px] mx-auto px-4 sm:px-6 flex flex-col items-center">
        <h2 className="font-serif text-2xl font-bold leading-[1.2] text-equally-action-color mb-4 max-w-[800px]">
          Your final checkpoint before anything goes live
        </h2>

        <p className="font-sans text-base leading-[1.4] text-text-primary max-w-[760px] mb-8">
          Inkloom AI creates an immutable System of Evidence for every piece of content. Every audit score, finding resolution, and manager override is logged with tamper-proof event records and guideline citations.
        </p>

        {/* Trust layer diagram */}
        <div className="w-full max-w-[1000px] mb-10 rounded-sm overflow-hidden border border-border shadow-sm bg-palette-7/30 p-4">
          <Image
            src="/images/04-content-creation-trust-layer-dam-2-1536x.webp"
            alt="Content creation - Trust layer - DAM"
            width={1024}
            height={324}
            className="w-full h-auto object-contain rounded-sm"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/dashboard"
            className="flex justify-center items-center px-12 py-3.5 font-sans text-base font-bold leading-[1.4] text-center text-background bg-primary hover:bg-[#004578] rounded-full cursor-pointer transition-all duration-300 shadow-sm"
          >
            Start Now
          </Link>
          <Link
            href="/guidelines"
            className="flex justify-center items-center px-12 py-3.5 font-sans text-base font-bold leading-[1.4] text-center text-primary border-2 border-primary rounded-full hover:bg-blue-50/60 transition-all duration-300 cursor-pointer"
          >
            Manage Brand Guidelines
          </Link>
        </div>
      </div>
    </section>
  );
}
